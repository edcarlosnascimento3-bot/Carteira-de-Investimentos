import { describe, it, expect } from 'vitest';
import { simularAposentadoria, calcularTaxaMensal, formatarTempoMeses } from './simuladoAposentadoria';

const base = {
  salarioAtual: 5000,
  salarioPretendido: 1000,
  inflacaoAnual: 0,
  aporteMensal: 200,
  aporteInicial: 0,
  modalidade: 'rf',
  taxaJurosAnual: 10,
  rendimentoMensalPct: 0.8,
  horizonteAnos: 40,
};

describe('calcularTaxaMensal', () => {
  it('converte a taxa anual de Renda Fixa para a taxa mensal equivalente (12ª parte composta)', () => {
    const taxa = calcularTaxaMensal('rf', 12, 0);
    expect(taxa).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 12);
    expect(taxa).toBeGreaterThan(0);
  });

  it('12 meses de rentabilidade RF a 12% a.a. equivalem a exatamente 12% sobre o capital', () => {
    const { meses } = simularAposentadoria({
      ...base,
      taxaJurosAnual: 12,
      aporteMensal: 0,
      aporteInicial: 1000,
      salarioPretendido: 1e9, // nunca atinge a meta
    });
    expect(meses[0].patrimonio).toBe(1000);
    expect(meses[12].patrimonio).toBeCloseTo(1000 * 1.12, 8);
    expect(meses[24].patrimonio).toBeCloseTo(1000 * 1.12 * 1.12, 8);
  });

  it('usa o rendimento mensal informado como taxa no modo FII', () => {
    expect(calcularTaxaMensal('fii', 0, 0.8)).toBeCloseTo(0.008, 12);

    const { meses } = simularAposentadoria({
      ...base,
      modalidade: 'fii',
      rendimentoMensalPct: 1,
      aporteMensal: 0,
      aporteInicial: 1000,
      salarioPretendido: 1e9,
    });
    expect(meses[12].patrimonio).toBeCloseTo(1000 * Math.pow(1.01, 12), 8);
  });
});

describe('linhas do gráfico', () => {
  it('gera um ponto por mês, do 0 até horizonteAnos * 12 (inclusive)', () => {
    const { meses } = simularAposentadoria({ ...base, horizonteAnos: 40 });
    expect(meses).toHaveLength(40 * 12 + 1);
    expect(meses[0].mes).toBe(0);
    expect(meses[meses.length - 1].mes).toBe(480);
  });

  it('"semRendimento" cresce de forma linear: aporteInicial + aporteMensal * m', () => {
    const { meses } = simularAposentadoria({ ...base, aporteInicial: 5000, aporteMensal: 200 });
    meses.forEach(({ mes, semRendimento }) => {
      expect(semRendimento).toBeCloseTo(5000 + 200 * mes, 8);
    });
  });

  it('expõe o ano de cada mês (floor(mes / 12))', () => {
    const { meses } = simularAposentadoria({ ...base });
    expect(meses[25].ano).toBe(2);
    expect(meses[12].ano).toBe(1);
    expect(meses[0].ano).toBe(0);
  });

  it('a linha "com rendimentos" sempre supera ou iguala a de aportes puros', () => {
    const { meses } = simularAposentadoria({ ...base, taxaJurosAnual: 10 });
    meses.forEach(({ semRendimento, patrimonio }) => {
      expect(patrimonio).toBeGreaterThanOrEqual(semRendimento - 1e-6);
    });
  });
});

describe('meta de aposentadoria', () => {
  // R$ 1.000/mês, sem inflação, aportando R$ 200/mês a 10% a.a.:
  // 200 * (1,10^(m/12) - 1) >= 1000  =>  m >= 12 * ln(6) / ln(1,10) ~= 225,58  =>  m = 226.
  it('detecta o primeiro mês em que o rendimento cobre a renda pretendida', () => {
    const { metaMes } = simularAposentadoria({ ...base });
    expect(metaMes).toBe(226);
  });

  it('nenhum mês anterior à meta atende; o mês da meta atende', () => {
    const taxaMensal = calcularTaxaMensal('rf', 10, 0.8);
    const { metaMes, meses } = simularAposentadoria({ ...base });

    expect(meses[1].patrimonio * taxaMensal).toBeLessThan(meses[1].rendaMeta);
    expect(meses[metaMes - 1].patrimonio * taxaMensal).toBeLessThan(meses[metaMes - 1].rendaMeta);
    expect(meses[metaMes].patrimonio * taxaMensal).toBeGreaterThanOrEqual(meses[metaMes].rendaMeta);
  });

  it('monta o resumo com o tempo, a renda corrigida e os totais', () => {
    const { metaMes, resumo, meses } = simularAposentadoria({ ...base });
    const taxaMensal = calcularTaxaMensal('rf', 10, 0.8);

    expect(resumo.tempoMeses).toBe(metaMes);
    expect(resumo.tempoFormatado).toBe('18 anos e 10 meses');
    expect(resumo.rendaNaMeta).toBeCloseTo(1000, 8); // inflação zerada
    expect(resumo.totalAportado).toBeCloseTo(200 * metaMes, 8);
    expect(resumo.patrimonioNecessario).toBe(meses[metaMes].patrimonio);
    expect(resumo.totalRendimento).toBeCloseTo(resumo.patrimonioNecessario - resumo.totalAportado, 8);
    expect(resumo.totalRendimento).toBeGreaterThan(0);
    expect(resumo.rendaMensalSacada).toBeCloseTo(resumo.patrimonioNecessario * taxaMensal, 8);
    expect(resumo.rendaMensalSacada).toBeGreaterThanOrEqual(resumo.rendaNaMeta);
    expect(resumo.patrimonioFinalPlano).toBe(resumo.patrimonioNecessario);
  });

  it('corrige a renda pretendida pela inflação (3% a.a. em 12 meses = 3%)', () => {
    const { meses } = simularAposentadoria({ ...base, inflacaoAnual: 3 });
    expect(meses[12].rendaMeta).toBeCloseTo(1000 * 1.03, 6);
    expect(meses[240].rendaMeta).toBeCloseTo(1000 * Math.pow(1.03, 20), 6);
  });

  it('com inflação zero a renda meta fica constante', () => {
    const { meses } = simularAposentadoria({ ...base, inflacaoAnual: 0 });
    meses.forEach(({ rendaMeta }) => {
      expect(rendaMeta).toBe(1000);
    });
  });
});

describe('plano de aposentadoria após a meta', () => {
  it('o patrimônio do plano fica CONSTANTE a partir do mês da meta (rendimento sacado)', () => {
    const { metaMes, resumo, meses } = simularAposentadoria({ ...base });
    expect(meses[metaMes].plano).toBe(meses[metaMes].patrimonio);

    const depoisDaMeta = meses.slice(metaMes + 1);
    expect(depoisDaMeta.length).toBeGreaterThan(0);
    depoisDaMeta.forEach(({ plano }) => {
      expect(plano).toBe(resumo.patrimonioNecessario); // linha horizontal exata
    });
  });

  it('a linha "com rendimentos" continua acumulando com aportes até o fim do horizonte', () => {
    const { metaMes, resumo, meses } = simularAposentadoria({ ...base });
    const ultimo = meses[meses.length - 1];
    expect(ultimo.patrimonio).toBeGreaterThan(resumo.patrimonioNecessario);
    expect(ultimo.plano).toBe(resumo.patrimonioNecessario);
    // após a meta a linha B segue crescendo mês a mês
    expect(meses[metaMes + 1].patrimonio).toBeGreaterThan(meses[metaMes].patrimonio);
  });
});

describe('casos-limite', () => {
  it('nunca atinge a meta → metaMes null e resumo com nulls coerentes', () => {
    const { metaMes, resumo, meses } = simularAposentadoria({
      ...base,
      salarioPretendido: 1000000,
      horizonteAnos: 40,
    });
    expect(metaMes).toBeNull();
    expect(meses).toHaveLength(481);
    expect(resumo.tempoMeses).toBeNull();
    expect(resumo.tempoFormatado).toBeNull();
    expect(resumo.patrimonioNecessario).toBeNull();
    expect(resumo.rendaNaMeta).toBeNull();
    expect(resumo.totalAportado).toBeNull();
    expect(resumo.totalRendimento).toBeNull();
    expect(resumo.patrimonioFinalPlano).toBeNull();
    expect(resumo.rendaMensalSacada).toBeNull();
    // sem meta, o plano nunca congela: as duas linhas de patrimônio coincidem
    const ultimo = meses[meses.length - 1];
    expect(ultimo.plano).toBe(ultimo.patrimonio);
  });

  it('taxa de juros zerada nunca atinge a meta (rendimento zero) e não quebra', () => {
    const { metaMes, resumo } = simularAposentadoria({
      ...base,
      taxaJurosAnual: 0,
      salarioPretendido: 1000,
    });
    expect(metaMes).toBeNull();
    expect(resumo.tempoFormatado).toBeNull();
  });

  it('aporte zero (sem aporte inicial) → patrimônio sempre zero e meta nula', () => {
    const { meses, metaMes, resumo } = simularAposentadoria({
      ...base,
      aporteMensal: 0,
      aporteInicial: 0,
    });
    meses.forEach(({ semRendimento, patrimonio, plano }) => {
      expect(semRendimento).toBe(0);
      expect(patrimonio).toBe(0);
      expect(plano).toBe(0);
    });
    expect(metaMes).toBeNull();
    expect(resumo.totalAportado).toBeNull();
  });

  it('aporte mensal zero com aporte inicial: só o capital inicial rende', () => {
    const { metaMes, resumo } = simularAposentadoria({
      ...base,
      aporteMensal: 0,
      aporteInicial: 100000,
      salarioPretendido: 500,
      taxaJurosAnual: 10,
    });
    // 100.000 * (1,10^(1/12) - 1) ~= R$ 803,70 > R$ 500 no primeiro mês
    expect(metaMes).toBe(1);
    expect(resumo.totalAportado).toBe(100000);
    expect(resumo.totalRendimento).toBeGreaterThan(0);
    expect(resumo.rendaMensalSacada).toBeGreaterThanOrEqual(500);
  });

  it('parâmetros numéricos ausentes ou inválidos não geram NaN nem crash', () => {
    const { meses, resumo } = simularAposentadoria({
      salarioPretendido: 'abc',
      aporteMensal: undefined,
      aporteInicial: null,
      inflacaoAnual: 'xyz',
      horizonteAnos: undefined, // default 40
    });
    expect(meses).toHaveLength(40 * 12 + 1);
    meses.forEach((ponto) => {
      expect(Number.isFinite(ponto.patrimonio)).toBe(true);
      expect(Number.isFinite(ponto.semRendimento)).toBe(true);
      expect(Number.isFinite(ponto.plano)).toBe(true);
      expect(Number.isFinite(ponto.rendaMeta)).toBe(true);
    });
    expect(resumo.tempoMeses).toBeNull(); // meta não atingida com aportes zerados
  });
});

describe('formatarTempoMeses', () => {
  it('formata em "X anos e Y meses"', () => {
    expect(formatarTempoMeses(226)).toBe('18 anos e 10 meses');
    expect(formatarTempoMeses(60)).toBe('5 anos e 0 meses');
    expect(formatarTempoMeses(0)).toBe('0 anos e 0 meses');
  });

  it('usa singular quando aplicável', () => {
    expect(formatarTempoMeses(13)).toBe('1 ano e 1 mês');
    expect(formatarTempoMeses(1)).toBe('0 anos e 1 mês');
  });
});
