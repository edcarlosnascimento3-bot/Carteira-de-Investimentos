import { useState, useEffect } from 'react';

/* ============================================================
   PONTO 4: HOOK PARA DADOS FINANCEIROS
   - Hook customizado para consumir APIs financeiras
   - Aceita: 'summary', 'stocks', 'crypto', 'fiis', 'fixed-income'
   - Fornece: dados, loading, erro para facilitar o uso nos componentes
   ============================================================ */

// Dados mockados para teste enquanto as APIs reais nao estao integradas
const mockData = {
  summary: {
    totalValue: 45280.50,
    dailyChange: 1.35,
    monthlyChange: 4.82,
    yearlyChange: 12.15,
    dividends: 320.40,
    nextMaturity: '15/06/2026',
  },
  stocks: [
    { ticker: 'PETR4', price: 38.42, change: 3.42 },
    { ticker: 'VALE3', price: 68.15, change: 2.18 },
    { ticker: 'ITUB4', price: 32.90, change: 1.75 },
    { ticker: 'ABEV3', price: 14.28, change: -0.55 },
    { ticker: 'BBAS3', price: 52.30, change: 0.89 },
  ],
};

/**
 * Hook para buscar dados financeiros
 * @param {string} type - Tipo de dado ('summary', 'stocks', etc.)
 * @param {Object} options - Opcoes adicionais (tickers, range, etc.)
 * @returns {{ data: any, loading: boolean, error: string | null }}
 */
export function useFinancialData(type = 'summary', options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // Simula delay de rede (remover quando integrar APIs reais)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // TODO: Substituir por chamada real a API
        // Exemplo com API real:
        // const result = await fetchStockQuotes(options.tickers);
        if (!cancelled) {
          setData(mockData[type] || null);
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

    // Cleanup: evita setState em componente desmontado
    return () => {
      cancelled = true;
    };
  }, [type, JSON.stringify(options)]);

  return { data, loading, error };
}
