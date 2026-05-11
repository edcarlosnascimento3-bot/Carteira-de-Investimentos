import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchStockQuotes } from '../services/api';

const mockData = {
  PETR4: { price: 38.42, change: 2.45 },
  VALE3: { price: 68.15, change: 1.98 },
  HGLG11: { price: 178.80, change: 0.52 },
  ITUB4: { price: 32.90, change: -0.34 },
  ABEV3: { price: 14.28, change: -0.55 },
  BBAS3: { price: 52.30, change: 0.89 },
  WEGE3: { price: 42.15, change: 1.23 },
  KNRI11: { price: 145.20, change: -0.42 },
  BTC: { price: 425000.00, change: 3.15 },
  ETH: { price: 28500.00, change: 2.78 },
};

export function usePrices(tickers = []) {
  const [prices, setPrices] = useState(() => {
    const initial = {};
    tickers.forEach((t) => { initial[t] = mockData[t]?.price ?? null; });
    return initial;
  });
  const [changes, setChanges] = useState(() => {
    const initial = {};
    tickers.forEach((t) => { if (mockData[t]) initial[t] = mockData[t].change; });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const fetch = useCallback(async () => {
    const unique = [...new Set(tickers.filter(Boolean))];
    if (unique.length === 0) return;

    setLoading(true);
    const result = await fetchStockQuotes(unique);
    if (!mountedRef.current) return;

    setPrices((prev) => {
      const next = { ...prev };
      unique.forEach((t) => {
        if (result[t]?.price) {
          next[t] = result[t].price;
        } else if (next[t] === null) {
          next[t] = mockData[t]?.price ?? null;
        }
      });
      return next;
    });

    setChanges((prev) => {
      const next = { ...prev };
      unique.forEach((t) => {
        if (result[t]?.change !== undefined) {
          next[t] = result[t].change;
        } else if (next[t] === undefined && mockData[t]) {
          next[t] = mockData[t].change;
        }
      });
      return next;
    });

    setLoading(false);
  }, [tickers]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();

    const id = setInterval(fetch, 20000);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetch]);

  return { prices, changes, loading, refresh: fetch };
}
