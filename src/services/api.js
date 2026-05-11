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
        return {
          price: meta.regularMarketPrice,
          change: meta.regularMarketChangePercent ?? 0,
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
      return {
        price: meta.regularMarketPrice,
        change: meta.regularMarketChangePercent ?? 0,
      };
    }
  } catch {}
  return null;
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
 * Busca cotacao atual de acoes brasileiras (B3)
 * @param {string[]} tickers - Ex: ['PETR4', 'VALE3', 'ITUB4']
 * @returns {Promise<Object>} Mapa { ticker: { price, change } }
 */
export async function fetchStockQuotes(tickers) {
  const results = {};
  const unique = [...new Set(tickers)];

  const fetches = unique.map(async (ticker) => {
    let data = await fetchYahooViaProxy(ticker);
    if (!data) data = await fetchYahoo(ticker);
    if (!data && !cryptoMap[ticker]) data = await fetchMfinance(ticker);
    results[ticker] = data ?? null;
  });

  await Promise.allSettled(fetches);
  return results;
}

export async function fetchHistoricalData(ticker, range = '1mo') {
  throw new Error('API nao implementada - use dados mockados');
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

export async function fetchTesouroDireto() {
  throw new Error('API nao implementada - use dados mockados');
}

export async function fetchFIIs(tickers) {
  throw new Error('API nao implementada - use dados mockados');
}

export default API_CONFIG;
