// ─── Métricas financeiras ─────────────────────────────────────────────────────
// Implementações puras (sem IO) para análises de carteira:
// CAGR, HHI, Tracking Error, Beta (CAPM) e Alpha de Jensen.
// Todas recebem retornos em fração (ex: 0.05 = 5%) e devolvem fração.

/** Média simples. `null` se vazio. */
export function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + (Number(v) || 0), 0);
  return sum / values.length;
}

/** Variância amostral (n-1). `null` se menos de 2 pontos. */
export function varianceSample(values) {
  const m = mean(values);
  if (m == null || values.length < 2) return null;
  return (
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1)
  );
}

/** Desvio padrão amostral. */
export function stdSample(values) {
  const v = varianceSample(values);
  return v == null ? null : Math.sqrt(v);
}

/** Covariância amostral (n-1) entre duas séries de mesmo tamanho. */
export function covarianceSample(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  if (a.length !== b.length || a.length < 2) return null;
  const ma = mean(a);
  const mb = mean(b);
  if (ma == null || mb == null) return null;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - ma) * (b[i] - mb);
  }
  return sum / (a.length - 1);
}

/** Anualiza um retorno médio por período. */
export function annualize(meanReturn, periodsPerYear = 252) {
  if (meanReturn == null) return null;
  if (!periodsPerYear || periodsPerYear <= 0) return null;
  return (1 + meanReturn) ** periodsPerYear - 1;
}

/**
 * CAGR: (Vf/Vi)^(1/n) - 1.
 * @param {number} initialValue - Valor inicial (VI)
 * @param {number} finalValue - Valor final (VF)
 * @param {number} years - Período em anos (pode ser fracionário)
 * @returns {number|null} CAGR em fração
 */
export function cagr(initialValue, finalValue, years) {
  if (initialValue == null || finalValue == null || years == null) return null;
  if (initialValue <= 0 || finalValue <= 0 || years <= 0) return null;
  return (finalValue / initialValue) ** (1 / years) - 1;
}

/**
 * HHI (Herfindahl-Hirschman): Σ(wi²), wi = vi / Σv.
 * Retorna valor normalizado em [0,1]. Quanto maior, mais concentrada.
 * @param {number[]} values - Posições/valores dos ativos (positivos)
 * @returns {number|null}
 */
export function hhi(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const total = values.reduce((acc, v) => acc + (Number(v) || 0), 0);
  if (total <= 0) return null;
  let sum = 0;
  for (const v of values) {
    const w = (Number(v) || 0) / total;
    sum += w * w;
  }
  return sum;
}

/**
 * Tracking Error: desvio padrão anualizado da diferença (porta - benchmark).
 * @param {number[]} portfolioReturns - Retornos da carteira
 * @param {number[]} benchmarkReturns - Retornos do benchmark
 * @param {number} [periodsPerYear=252] - Períodos por ano para anualizar
 * @returns {number|null}
 */
export function trackingError(portfolioReturns, benchmarkReturns, periodsPerYear = 252) {
  const diff = mapDiff(portfolioReturns, benchmarkReturns);
  if (diff == null) return null;
  const s = stdSample(diff);
  if (s == null) return null;
  return s * Math.sqrt(periodsPerYear && periodsPerYear > 0 ? periodsPerYear : 1);
}

/**
 * Beta (CAPM): Cov(rm, rp) / Var(rm).
 * @param {number[]} portfolioReturns - Retornos da carteira
 * @param {number[]} benchmarkReturns - Retornos do benchmark (mercado)
 * @returns {number|null} `null` se benchmark sem variação
 */
export function beta(portfolioReturns, benchmarkReturns) {
  if (!Array.isArray(portfolioReturns) || !Array.isArray(benchmarkReturns)) return null;
  if (portfolioReturns.length !== benchmarkReturns.length) return null;
  const cov = covarianceSample(portfolioReturns, benchmarkReturns);
  const varBench = varianceSample(benchmarkReturns);
  if (cov == null || varBench == null || varBench === 0) return null;
  return cov / varBench;
}

/**
 * Alpha de Jensen: Rp - [Rf + β(Rm - Rf)] (anualizado).
 * @param {number[]} portfolioReturns - Retornos da carteira
 * @param {number[]} benchmarkReturns - Retornos do benchmark (mercado)
 * @param {number} [riskFreeAnnual=0] - Taxa livre de risco anual (fração)
 * @param {number} [periodsPerYear=252] - Períodos por ano
 * @returns {number|null}
 */
export function jensenAlpha(
  portfolioReturns,
  benchmarkReturns,
  riskFreeAnnual = 0,
  periodsPerYear = 252
) {
  const betaValue = beta(portfolioReturns, benchmarkReturns);
  if (betaValue == null) return null;
  const rp = annualize(mean(portfolioReturns), periodsPerYear);
  const rm = annualize(mean(benchmarkReturns), periodsPerYear);
  if (rp == null || rm == null) return null;
  const rf = Number(riskFreeAnnual) || 0;
  return rp - (rf + betaValue * (rm - rf));
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Diferença elemento a elemento. `null` se tamanhos diferentes/vazios. */
function mapDiff(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  if (a.length !== b.length || a.length === 0) return null;
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] - b[i];
  return out;
}