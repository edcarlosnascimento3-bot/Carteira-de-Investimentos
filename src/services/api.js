const BRAPI_TOKEN = 'aRS1vgdPiC9c7WwVDu4Tnq';

const API_CONFIG = {
  yahooFinance: {
    baseUrl: '/api/yahoo',
  },
  mfinance: {
    baseUrl: 'https://mfinance.com.br/api/v1/stocks',
  },
  coinGecko: {
    baseUrl: 'https://api.coingecko.com/api/v3',
  },
  brapi: {
    baseUrl: 'https://brapi.dev/api',
    token: BRAPI_TOKEN,
  },
};

const cryptoMap = {
  BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD',
  ADA: 'ADA-USD', XRP: 'XRP-USD', DOGE: 'DOGE-USD', DOT: 'DOT-USD',
};

const exchangeMap = { USDBRL: 'USDBRL=X', EURBRL: 'EURBRL=X' };

function yahooSymbol(ticker) {
  if (cryptoMap[ticker]) return cryptoMap[ticker];
  if (exchangeMap[ticker]) return exchangeMap[ticker];
  if (/[0-9]/.test(ticker)) return `${ticker}.SA`;
  return ticker;
}

const yahooHosts = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

async function fetchYahoo(ticker) {
  const symbol = yahooSymbol(ticker);
  for (const host of yahooHosts) {
    try {
      const url = `${host}/v8/finance/chart/${symbol}?range=1d&interval=1d`;
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) continue;
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        let change = meta.regularMarketChangePercent;
        if (change === undefined || change === null) {
          const prevClose = meta.chartPreviousClose || meta.previousClose;
          if (prevClose) {
            change = ((meta.regularMarketPrice - prevClose) / prevClose) * 100;
          } else {
            change = 0;
          }
        }
        return {
          price: meta.regularMarketPrice,
          change: change,
        };
      }
    } catch {}
  }
  return null;
}

async function fetchYahooViaProxy(ticker) {
  try {
    const symbol = yahooSymbol(ticker);
    const url = `${API_CONFIG.yahooFinance.baseUrl}/chart/${symbol}?range=1d&interval=1d`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice) {
      let change = meta.regularMarketChangePercent;
      if (change === undefined || change === null) {
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        if (prevClose) {
          change = ((meta.regularMarketPrice - prevClose) / prevClose) * 100;
        } else {
          change = 0;
        }
      }
      return {
        price: meta.regularMarketPrice,
        change: change,
      };
    }
  } catch {}
  return null;
}

export async function fetchYahooDividends(ticker) {
  const symbol = yahooSymbol(ticker);
  for (const host of yahooHosts) {
    try {
      const url = `${host}/v8/finance/chart/${symbol}?events=div,splits&range=3y&interval=1d`;
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result?.events?.dividends) continue;

      const dividends = [];
      const divMap = result.events.dividends;
      for (const key of Object.keys(divMap)) {
        const d = divMap[key];
        const amount = parseFloat(d.amount) || 0;
        if (amount <= 0) continue;
        const dateUnix = d.date || parseInt(key, 10);
        if (!dateUnix) continue;
        const dt = new Date(dateUnix * 1000);
        const dia = String(dt.getUTCDate()).padStart(2, '0');
        const mes = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const ano = dt.getUTCFullYear();
        dividends.push({
          date: `${dia}/${mes}/${ano}`,
          year: ano,
          type: 'Dividendo',
          value: amount,
        });
      }
      if (dividends.length > 0) {
        return dividends.sort((a, b) => b.year - a.year);
      }
    } catch {}
  }
  return [];
}

async function fetchMfinance(ticker) {
  try {
    if (cryptoMap[ticker]) return null;
    const symbol = ticker.replace('.SA', '');
    const url = `${API_CONFIG.mfinance.baseUrl}/${symbol}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.price) {
      return {
        price: json.price,
        change: json.changePercent ?? 0,
      };
    }
  } catch {}
  return null;
}

/**
 * Busca cotacao via brapi.dev (mais confiavel para B3)
 */
export async function fetchBrapiQuote(ticker) {
  try {
    const symbol = ticker.replace('.SA', '');
    const url = `/api/brapi/quote/${symbol}?token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.results?.[0];
    if (item?.regularMarketPrice) {
      return {
        price: item.regularMarketPrice,
        change: item.regularMarketChangePercent ?? 0,
      };
    }
  } catch {}
  return null;
}

/**
 * Busca historico de dividendos/JCP de um ativo via brapi.dev
 * @param {string} ticker - Ex: 'PETR4'
 * @returns {Promise<Array<{date:string, type:string, value:number}>>}
 */
export async function fetchBrapiDividends(ticker) {
  try {
    const symbol = ticker.replace('.SA', '');
    const url = `/api/brapi/quote/${symbol}?dividends=true&token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const item = json?.results?.[0];
    if (!item?.dividendsData?.cashDividends) return [];

    const dividends = [];
    for (const d of item.dividendsData.cashDividends) {
      const value = parseFloat(d.rate) || 0;
      if (value <= 0) continue;
      const dateStr = d.paymentDate || d.approvalDate || '';
      if (!dateStr) continue;
      const d2 = new Date(dateStr);
      if (isNaN(d2)) continue;
      const dia = String(d2.getUTCDate()).padStart(2, '0');
      const mes = String(d2.getUTCMonth() + 1).padStart(2, '0');
      const ano = d2.getUTCFullYear();
      const formatted = `${dia}/${mes}/${ano}`;
      const label = (d.label || '').toUpperCase();
      let type;
      if (label === 'JCP') type = 'JCP';
      else if (label === 'DIVIDENDO') type = 'Dividendo';
      else if (label === 'RENDIMENTO') type = 'Rendimento';
      else type = d.isinCode?.includes('JCP') ? 'JCP' : 'Dividendo';

      dividends.push({
        date: formatted,
        year: ano,
        type,
        value,
      });
    }
    return dividends.sort((a, b) => b.year - a.year);
  } catch {
    return [];
  }
}

/**
 * Busca indicadores fundamentalistas via brapi.dev (modules)
 * @param {string} ticker - Ex: 'PETR4'
 * @returns {Promise<Object|null>}
 */
export async function fetchBrapiFundamentals(ticker) {
  try {
    const symbol = ticker.replace('.SA', '');
    const url = `/api/brapi/quote/${symbol}?modules=defaultKeyStatistics,financialData&token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.results?.[0];
    if (!item) return null;

    const stats = item.defaultKeyStatistics?.[0] || {};
    const fin = item.financialData?.[0] || {};

    const formatIndicator = (obj, key, rating = 'neutro') => {
      const raw = obj?.[key]?.[0]?.raw;
      const fmt = obj?.[key]?.[0]?.fmt ?? '—';
      if (raw === undefined || raw === null) return null;
      return { valor: fmt, avaliacao: rating };
    };

    const classify = (v, thresholds) => {
      if (v == null) return 'neutro';
      if (thresholds.bom(v)) return 'bom';
      if (thresholds.ruim(v)) return 'ruim';
      return 'neutro';
    };

    const pL = formatIndicator(stats, 'trailingPE', 'neutro');
    const pVp = formatIndicator(stats, 'priceToBook', 'neutro');
    const dy = formatIndicator(stats, 'dividendYield', 'neutro');
    const roe = formatIndicator(fin, 'returnOnEquity', 'neutro');

    const data = {
      valuation: [],
      eficiencia: [],
      endividamento: [],
      rentabilidade: [],
      crescimento: [],
    };

    if (pL) data.valuation.push({ nome: 'P/L', ...pL });
    if (pVp) data.valuation.push({ nome: 'P/VP', ...pVp });
    if (dy) {
      const rawDy = stats.trailingPE?.[0]?.raw;
      data.valuation.push({
        nome: 'Dividend Yield',
        valor: dy.valor,
        avaliacao: classify(rawDy ? (1 / rawDy) : null, {
          bom: v => v > 0.05,
          ruim: v => v < 0.02,
        }),
      });
    }

    const evEbitda = formatIndicator(stats, 'enterpriseValueToEbitda', 'neutro');
    if (evEbitda) data.valuation.push({ nome: 'EV/EBITDA', ...evEbitda });

    const mArgBruta = fin?.grossMargins?.[0]?.raw;
    const mLiquida = fin?.profitMargins?.[0]?.raw;
    if (mArgBruta != null) {
      data.eficiencia.push({
        nome: 'Margem Bruta',
        valor: `${(mArgBruta * 100).toFixed(1)}%`,
        avaliacao: classify(mArgBruta, { bom: v => v > 0.30, ruim: v => v < 0.10 }),
      });
    }
    if (mLiquida != null) {
      data.eficiencia.push({
        nome: 'Margem Líquida',
        valor: `${(mLiquida * 100).toFixed(1)}%`,
        avaliacao: classify(mLiquida, { bom: v => v > 0.10, ruim: v => v < 0.03 }),
      });
    }

    if (roe) {
      const rawRoe = fin?.returnOnEquity?.[0]?.raw;
      data.rentabilidade.push({
        nome: 'ROE',
        valor: rawRoe != null ? `${(rawRoe * 100).toFixed(1)}%` : '—',
        avaliacao: classify(rawRoe, { bom: v => v > 0.12, ruim: v => v < 0.05 }),
      });
    }

    const dívidaEbitda = formatIndicator(fin, 'totalDebtToEnterpriseValue', 'neutro');
    if (dívidaEbitda) data.endividamento.push({ nome: 'Dívida/Valor Firma', ...dívidaEbitda });

    const currentRatio = formatIndicator(fin, 'currentRatio', 'neutro');
    if (currentRatio) data.endividamento.push({ nome: 'Liquidez Corrente', ...currentRatio });

    const revenueGrowth = fin?.revenueGrowth?.[0]?.raw;
    if (revenueGrowth != null) {
      data.crescimento.push({
        nome: 'Crescimento Receita',
        valor: `${(revenueGrowth * 100).toFixed(1)}%`,
        avaliacao: classify(revenueGrowth, { bom: v => v > 0.05, ruim: v => v < -0.02 }),
      });
    }

    return Object.fromEntries(
      Object.entries(data).filter(([, v]) => v.length > 0)
    );
  } catch {
    return null;
  }
}

/**
 * Busca cotacao atual de acoes brasileiras (B3)
 * @param {string[]} tickers - Ex: ['PETR4', 'VALE3', 'ITUB4']
 * @returns {Promise<Object>} Mapa { ticker: { price, change } }
 */
export async function fetchStockQuotes(tickers) {
  const results = {};
  const unique = [...new Set(tickers)];

  const fetches = unique.map(async (ticker) => {
    let data = await fetchBrapiQuote(ticker);
    if (!data) data = await fetchYahooViaProxy(ticker);
    if (!data) data = await fetchYahoo(ticker);
    if (!data && !cryptoMap[ticker]) data = await fetchMfinance(ticker);
    results[ticker] = data ?? null;
  });

  await Promise.allSettled(fetches);
  return results;
}

/**
 * Busca dados historicos de precos via brapi.dev
 * @param {string} ticker - Ex: 'PETR4'
 * @param {string} range - '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max'
 * @param {string} interval - '1d' | '1wk' | '1mo'
 * @returns {Promise<Array<{date:string, open:number, high:number, low:number, close:number, volume:number}>>}
 */
export async function fetchHistoricalData(ticker, range = '1y', interval = '1d') {
  try {
    const symbol = ticker.replace('.SA', '');
    const url = `/api/brapi/quote/${symbol}?range=${range}&interval=${interval}&token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const item = json?.results?.[0];
    if (!item?.historicalDataPrice) return [];

    return item.historicalDataPrice
      .filter(h => h.close != null)
      .map(h => ({
        date: h.date
          ? `${String(h.date).slice(6, 8)}/${String(h.date).slice(4, 6)}/${String(h.date).slice(0, 4)}`
          : '',
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
        volume: h.volume || 0,
      }));
  } catch {
    return [];
  }
}

/**
 * Busca dados de criptomoedas
 */
export async function fetchCryptoData(coins) {
  try {
    const ids = coins.join(',');
    const url = `${API_CONFIG.coinGecko.baseUrl}/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Busca perfil de empresa (setor + subsetor/industria) via brapi.dev
 * @param {string} ticker - Ex: 'PETR4'
 * @returns {Promise<{sector:string, industry:string}|null>}
 */
export async function fetchBrapiProfile(ticker) {
  try {
    const symbol = ticker.replace('.SA', '');
    const url = `/api/brapi/quote/${symbol}?modules=summaryProfile&token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const item = json?.results?.[0];
    if (!item?.summaryProfile?.[0]) return null;
    const profile = item.summaryProfile[0];
    return {
      sector: (profile.sector || '').trim(),
      industry: (profile.industry || '').trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Busca perfis (setor/subsetor) de múltiplos tickers via brapi.dev
 * (requisições individuais — o free plan permite 1 ativo por chamada)
 * @param {string[]} tickers - Lista de tickers
 * @param {number} [concurrency=5] - Requisições simultâneas
 * @returns {Promise<Object.<string, {sector:string, industry:string}>>}
 */
export async function fetchBrapiProfilesBatch(tickers, concurrency = 20) {
  const result = {};
  const unique = [...new Set(tickers.map(t => t.replace('.SA', '')))];
  
  // Divide em lotes de 'concurrency' tickers por requisição
  for (let i = 0; i < unique.length; i += concurrency) {
    if (i > 0) await new Promise(r => setTimeout(r, 250)); // pequena pausa para não engargalar
    const chunk = unique.slice(i, i + concurrency);
    
    try {
      const symbolsStr = chunk.join(',');
      const url = `/api/brapi/quote/${symbolsStr}?modules=summaryProfile&token=${API_CONFIG.brapi.token}`;
      const res = await fetch(url);
      
      if (!res.ok) continue;
      const json = await res.json();
      
      if (!json?.results) continue;
      
      for (const item of json.results) {
        if (!item) continue;
        const profile = item?.summaryProfile?.[0];
        if (profile?.sector) {
          result[item.symbol] = {
            sector: profile.sector.trim(),
            industry: (profile.industry || '').trim(),
          };
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar batch de perfis", chunk, e);
    }
  }
  return result;
}

export async function fetchTesouroDireto() {
  throw new Error('API nao implementada - use dados mockados');
}

/**
 * Busca dados de FIIs via brapi.dev (quote normalizado)
 * @param {string[]} tickers - Ex: ['HGLG11', 'KNRI11']
 * @returns {Promise<Object>} Mapa { ticker: { price, change } }
 */
export async function fetchFIIs(tickers) {
  const results = {};
  try {
    const symbols = [...new Set(tickers.map(t => t.replace('.SA', '')))].join(',');
    const url = `/api/brapi/quote/${symbols}?token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return results;
    const json = await res.json();
    if (!json?.results) return results;
    for (const item of json.results) {
      if (item?.regularMarketPrice) {
        results[item.symbol] = {
          price: item.regularMarketPrice,
          change: item.regularMarketChangePercent ?? 0,
        };
      }
    }
  } catch {}
  return results;
}

/**
 * Busca todos os tickers de acoes disponiveis na brapi com dados de setor
 * @returns {Promise<Array<{stock:string, sector:string, name:string}>>} Lista de ações com setor
 */
export async function fetchAllStocksWithSectors() {
  try {
    const url = `/api/brapi/quote/list?token=${API_CONFIG.brapi.token}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json?.stocks) return [];
    return json.stocks
      .filter(s => s.type === 'stock' && s.sector)
      .map(s => ({
        stock: s.stock,
        sector: (s.sector || '').trim(),
        name: (s.name || '').trim(),
      }));
  } catch {
    return [];
  }
}

export default API_CONFIG;
