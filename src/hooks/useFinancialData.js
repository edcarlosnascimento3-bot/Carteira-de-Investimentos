import { useState, useEffect } from 'react';

/**
 * Hook para buscar dados financeiros
 * @param {string} type - Tipo de dado ('summary', 'stocks', etc.)
 * @param {Object} options - Opcoes adicionais (tickers, range, etc.)
 * @returns {{ data: any, loading: boolean, error: string | null }}
 */
export function useFinancialData(type = 'summary', options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const tickers = options.tickers || [];
        if (tickers.length === 0) {
          if (!cancelled) setData(null);
          return;
        }
        const { default: api } = await import('../services/api');
        const result = await api.fetchStockQuotes(tickers);
        if (!cancelled) {
          if (type === 'stocks') {
            setData(tickers.map(t => ({ ticker: t, ...result[t] })).filter(Boolean));
          } else {
            setData(result);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Erro ao carregar dados financeiros');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [type, JSON.stringify(options)]);

  return { data, loading, error };
}
