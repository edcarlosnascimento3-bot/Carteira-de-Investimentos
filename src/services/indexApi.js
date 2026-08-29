export async function fetchCurrentYearReturns() {
  const currentYear = new Date().getFullYear();
  const result = {};
  const errors = {};

  try {
    const res = await fetch('/api/yahoo/chart/%5EBVSP?range=2y&interval=1d');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const resultData = json?.chart?.result?.[0];
    if (!resultData) throw new Error('No chart result');
    const timestamps = resultData.timestamp || [];
    const closes = resultData.indicators?.quote?.[0]?.close || [];
    const meta = resultData.meta;
    const currentPrice = meta?.regularMarketPrice;
    if (!currentPrice) throw new Error('No current price');

    const first2026Close = closes.find((c, i) => {
      if (c == null) return false;
      const d = new Date(timestamps[i] * 1000);
      return d.getFullYear() === currentYear;
    });
    if (first2026Close == null) throw new Error('No 2026 data');
    result.IBOVESPA = Math.round(((currentPrice / first2026Close) - 1) * 10000) / 100;
  } catch (e) {
    errors.IBOVESPA = String(e);
  }

  try {
    const res = await fetch('/api/brapi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'quote/IFIX', params: { range: '5y', interval: '1d' } }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const item = json?.results?.[0];
    if (!item) throw new Error('No result');
    const historical = item.historicalDataPrice;
    if (!historical || historical.length === 0) throw new Error('No historical data');
    const currentPrice = item.regularMarketPrice;
    if (!currentPrice) throw new Error('No current price');

    const first2026Close = historical.find((h) => {
      if (!h?.close) return false;
      const d = new Date(h.date);
      return d.getFullYear() === currentYear;
    });
    if (!first2026Close) throw new Error('No 2026 historical data');
    result.IFIX = Math.round(((currentPrice / first2026Close.close) - 1) * 10000) / 100;
  } catch (e) {
    errors.IFIX = String(e);
  }

  try {
    const res = await fetch('/api/bcb/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2026&dataFinal=31/12/2026');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const monthly = (data || []).filter((d) => d.valor != null).map((d) => parseFloat(d.valor) / 100);
    if (monthly.length === 0) throw new Error('No IPCA data');
    let ytd = 1;
    monthly.forEach((v) => { ytd *= (1 + v); });
    result.IPCA = Math.round((ytd - 1) * 10000) / 100;
  } catch (e) {
    errors.IPCA = String(e);
  }

  try {
    const res = await fetch('/api/bcb/dados/serie/bcdata.sgs.4391/dados?formato=json&dataInicial=01/01/2026&dataFinal=31/12/2026');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const monthly = (data || []).filter((d) => d.valor != null).map((d) => parseFloat(d.valor) / 100);
    if (monthly.length === 0) throw new Error('No CDI data');
    let ytd = 1;
    monthly.forEach((v) => { ytd *= (1 + v); });
    result.CDI = Math.round((ytd - 1) * 10000) / 100;
  } catch (e) {
    errors.CDI = String(e);
  }

  return { currentYear, data: result, errors };
}