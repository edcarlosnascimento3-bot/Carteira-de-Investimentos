import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchStockQuotes } from '../services/api';

export function usePrices(tickers = []) {
  const [prices, setPrices] = useState({});
  const [changes, setChanges] = useState({});
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
        }
      });
      return next;
    });

    setChanges((prev) => {
      const next = { ...prev };
      unique.forEach((t) => {
        if (result[t]?.change !== undefined) {
          next[t] = result[t].change;
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
