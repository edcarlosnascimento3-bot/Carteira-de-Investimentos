import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchBrapiQuote,
  fetchHistoricalData,
  fetchYahooDividends,
  fetchCryptoData,
  fetchStockQuotes,
  fetchFIIs,
  fetchTesouroDireto,
} from './api';

const ok = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

const fail = (status = 500) => ({
  ok: false,
  status,
  json: async () => ({}),
});

const parseBody = (opts) => (opts?.body ? JSON.parse(opts.body) : {});

function mockFetch(routes) {
  const fn = vi.fn(async (url, opts) => {
    for (const route of routes) {
      if (route.matches(url, opts)) return route.handler(url, opts);
    }
    return fail();
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const anyUrl = (pred) => ({ matches: (u) => pred(u) });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchBrapiQuote', () => {
  it('retorna preço e variação quando há resultado', async () => {
    mockFetch([
      {
        matches: () => true,
        handler: () => ok({ results: [{ regularMarketPrice: 25.5, regularMarketChangePercent: 1.5 }] }),
      },
    ]);

    const result = await fetchBrapiQuote('PETR4');

    expect(result).toEqual({ price: 25.5, change: 1.5 });
  });

  it('retorna null com resultados vazios, resposta não-ok ou falha de rede', async () => {
    for (const handler of [
      () => ok({ results: [] }),
      () => fail(),
      () => { throw new Error('net'); },
    ]) {
      mockFetch([{ matches: (u) => u === '/api/brapi', handler }]);
      const result = await fetchBrapiQuote('VALE3');
      expect(result).toBeNull();
      vi.unstubAllGlobals();
    }
  });
});

describe('fetchHistoricalData', () => {
  it('formata datas em DD/MM/AAAA e normaliza os campos', async () => {
    mockFetch([
      {
        matches: () => true,
        handler: () => ok({
          results: [{
            historicalDataPrice: [
              { date: '20240115', open: 1, high: 2, low: 0.5, close: 1.2, volume: 100 },
              { date: '20240116', close: 1.3 },
            ],
          }],
        }),
      },
    ]);

    const result = await fetchHistoricalData('PETR4');

    expect(result[0].date).toBe('15/01/2024');
    expect(result[0].close).toBe(1.2);
    expect(result[0].volume).toBe(100);
    expect(result[1].date).toBe('16/01/2024');
    expect(result[1].close).toBe(1.3);
    expect(result[1].volume).toBe(0);
  });
});

describe('fetchYahooDividends', () => {
  it('usa query2 quando query1 falha e ordena por ano decrescente', async () => {
    const fetchMock = mockFetch([
      anyUrl((u) => u.startsWith('https://query1.finance.yahoo.com')),
      {
        matches: (u) => u.startsWith('https://query2.finance.yahoo.com'),
        handler: () => ok({
          chart: {
            result: [{
              events: {
                dividends: {
                  '1704067200': { amount: 0.5, date: 1704067200 },
                  '1625097600': { amount: 0.7, date: 1625097600 },
                  '1500000000': { amount: 0 },
                },
              },
            }],
          },
        }),
      },
    ]);

    const result = await fetchYahooDividends('PETR4');

    expect(result).toEqual([
      { date: '01/01/2024', year: 2024, type: 'Dividendo', value: 0.5 },
      { date: '01/07/2021', year: 2021, type: 'Dividendo', value: 0.7 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('query1.finance.yahoo.com'),
      expect.anything(),
    );
  });

  it('retorna [] quando não há dividendos', async () => {
    mockFetch([
      anyUrl((u) => u.startsWith('https://query1.finance.yahoo.com')),
      {
        matches: (u) => u.startsWith('https://query2.finance.yahoo.com'),
        handler: () => ok({ chart: { result: [{ events: {} }] } }),
      },
    ]);

    const result = await fetchYahooDividends('PETR4');

    expect(result).toEqual([]);
  });
});

describe('fetchCryptoData', () => {
  it('monta URL do CoinGecko e retorna o JSON', async () => {
    const fetchMock = mockFetch([
      {
        matches: (u) => u.startsWith('https://api.coingecko.com/api/v3'),
        handler: () => ok({ bitcoin: { brl: 300000, brl_24h_change: 1.2 } }),
      },
    ]);

    const result = await fetchCryptoData(['bitcoin', 'ethereum']);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true',
    );
    expect(result.bitcoin.brl).toBe(300000);
  });

  it('retorna null em falha de rede', async () => {
    mockFetch([{ matches: () => true, handler: () => { throw new Error('net'); } }]);

    const result = await fetchCryptoData(['bitcoin']);

    expect(result).toBeNull();
  });
});

describe('fetchStockQuotes', () => {
  it('deduplica tickers e retorna o mapa completo', async () => {
    const fetchMock = mockFetch([
      {
        matches: (u) => u === '/api/brapi',
        handler: (u, opts) => {
          const { path } = parseBody(opts);
          const ticker = path.replace('quote/', '');
          const data = {
            PETR4: { results: [{ regularMarketPrice: 10, regularMarketChangePercent: 1 }] },
            VALE3: { results: [{ regularMarketPrice: 20, regularMarketChangePercent: 2 }] },
          }[ticker];
          return data ? ok(data) : fail();
        },
      },
    ]);

    const result = await fetchStockQuotes(['PETR4', 'VALE3', 'PETR4']);

    expect(result).toEqual({
      PETR4: { price: 10, change: 1 },
      VALE3: { price: 20, change: 2 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('segue a cadeia de fallback brapi → proxy → yahoo', async () => {
    mockFetch([
      {
        matches: (u) => u === '/api/brapi',
        handler: (u, opts) => {
          const { path } = parseBody(opts);
          return path === 'quote/PETR4'
            ? ok({ results: [{ regularMarketPrice: 10, regularMarketChangePercent: 1 }] })
            : fail();
        },
      },
      anyUrl((u) => u.startsWith('/api/yahoo/chart/')),
      anyUrl((u) => u.startsWith('https://query1.finance.yahoo.com')),
      {
        matches: (u) => u.startsWith('https://query2.finance.yahoo.com'),
        handler: () => ok({ chart: { result: [{ meta: { regularMarketPrice: 25, regularMarketChangePercent: 2.5 } }] } }),
      },
    ]);

    const result = await fetchStockQuotes(['PETR4', 'VALE3']);

    expect(result.PETR4).toEqual({ price: 10, change: 1 });
    expect(result.VALE3).toEqual({ price: 25, change: 2.5 });
  });

  it('cripto não usa mfinance e não fornece quanto falha em todo o chain', async () => {
    const fetchMock = mockFetch([
      anyUrl((u) => u === '/api/brapi'),
      anyUrl((u) => u.startsWith('/api/yahoo/chart/BTC-USD')),
      anyUrl((u) => u.startsWith('https://query1.finance.yahoo.com') || u.startsWith('https://query2.finance.yahoo.com')),
    ]);

    const result = await fetchStockQuotes(['BTC']);

    expect(result.BTC).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url.includes('mfinance.com.br'))).toBe(false);
  });

  it('limita o número de requisições simultâneas', async () => {
    const tickers = ['AAAA1', 'BBBB2', 'CCCC3', 'DDDD4', 'EEEE5'];
    let inflight = 0;
    let maxInflight = 0;
    let resolveGate;
    const gate = new Promise((r) => { resolveGate = r; });

    mockFetch([
      {
        matches: (u) => u === '/api/brapi',
        handler: async () => {
          inflight += 1;
          maxInflight = Math.max(maxInflight, inflight);
          await gate;
          inflight -= 1;
          return ok({ results: [{ regularMarketPrice: 10, regularMarketChangePercent: 0 }] });
        },
      },
    ]);

    const promise = fetchStockQuotes(tickers, 2);
    await new Promise((r) => setTimeout(r, 0));

    expect(maxInflight).toBe(2);

    resolveGate();
    const results = await promise;

    expect(maxInflight).toBe(2);
    expect(Object.keys(results)).toHaveLength(5);
    expect(results[tickers[0]].price).toBe(10);
    expect(results[tickers[4]].price).toBe(10);
  });
});

describe('fetchFIIs', () => {
  it('deduplica símbolos e normaliza variação padrão como 0', async () => {
    mockFetch([
      {
        matches: (u, opts) => u === '/api/brapi' && parseBody(opts).path === 'quote/HGLG11,KNRI11',
        handler: () => ok({
          results: [
            { symbol: 'HGLG11', regularMarketPrice: 100, regularMarketChangePercent: 2.5 },
            { symbol: 'KNRI11', regularMarketPrice: 50, regularMarketChangePercent: null },
          ],
        }),
      },
    ]);

    const result = await fetchFIIs(['HGLG11', 'KNRI11', 'HGLG11']);

    expect(result).toEqual({
      HGLG11: { price: 100, change: 2.5 },
      KNRI11: { price: 50, change: 0 },
    });
  });
});

describe('fetchTesouroDireto', () => {
  it('rejeita por não estar implementado', async () => {
    await expect(fetchTesouroDireto()).rejects.toThrow('nao implementada');
  });
});