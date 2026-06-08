import { useState, useEffect, useMemo } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { fetchBrapiDividends } from '../services/api';
import { formatCurrency } from '../services/format';

function groupByYear(arr) {
  const map = {};
  for (const item of arr) {
    const y = item.year;
    if (!map[y]) map[y] = [];
    map[y].push(item);
  }
  return map;
}

const statusCores = {
  ok: { bg: '#00CC6622', color: '#00CC66', label: 'OK' },
  parcial: { bg: '#C8B80022', color: '#C8B800', label: 'Parcial' },
  faltando: { bg: '#FF555522', color: '#FF5555', label: 'Faltando' },
  pendente: { bg: '#88888822', color: '#888888', label: 'Pendente' },
};

function Conferencia() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [selectedTicker, setSelectedTicker] = useState('');
  const [apiDividends, setApiDividends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('year');

  const tickersCarteira = useMemo(() => {
    return [...new Set(transactions.map(t => t.ticker))].sort();
  }, [transactions]);

  const userDividendsByTicker = useMemo(() => {
    const map = {};
    for (const p of proventos) {
      const montante = (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
      if (!map[p.ticker]) map[p.ticker] = [];
      const parts = (p.data || '').split('/');
      const year = parts.length === 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
      map[p.ticker].push({ ...p, year, montante });
    }
    return map;
  }, [proventos]);

  const tiposValidos = ['Dividendo', 'JCP'];

  useEffect(() => {
    if (!selectedTicker) {
      setApiDividends([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBrapiDividends(selectedTicker).then(data => {
      if (!cancelled) {
        setApiDividends(data.filter(d => tiposValidos.includes(d.type)));
        setLoading(false);
      }
    }).catch(err => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedTicker]);

  const analysis = useMemo(() => {
    if (!selectedTicker) return null;
    const api = apiDividends;
    const user = userDividendsByTicker[selectedTicker] || [];

    const apiByYear = groupByYear(api);
    const userByYear = groupByYear(user);

    const allYears = [...new Set([
      ...Object.keys(apiByYear).map(Number),
      ...Object.keys(userByYear).map(Number),
    ])].sort((a, b) => b - a);

    const years = allYears.map(year => {
      const apiTotal = (apiByYear[year] || []).reduce((s, d) => s + d.value, 0);
      const userTotal = (userByYear[year] || []).reduce((s, d) => s + d.montante, 0);
      const apiCount = (apiByYear[year] || []).length;
      const userCount = (userByYear[year] || []).length;

      let status;
      if (apiTotal === 0 && userTotal === 0) status = 'ok';
      else if (userTotal === 0 && apiTotal > 0) status = 'faltando';
      else if (apiTotal === 0 && userTotal > 0) status = 'pendente';
      else {
        const diff = Math.abs(userTotal - apiTotal);
        const ratio = diff / Math.max(apiTotal, 1);
        if (ratio < 0.05) status = 'ok';
        else status = 'parcial';
      }

      return { year, apiTotal, userTotal, apiCount, userCount, status };
    });

    const totalApi = api.reduce((s, d) => s + d.value, 0);
    const totalUser = user.reduce((s, d) => s + d.montante, 0);

    const totalStatus = totalApi === 0 && totalUser === 0 ? 'ok'
      : totalUser === 0 && totalApi > 0 ? 'faltando'
      : totalApi === 0 && totalUser > 0 ? 'pendente'
      : Math.abs(totalUser - totalApi) / Math.max(totalApi, 1) < 0.05 ? 'ok'
      : 'parcial';

    return { years, totalApi, totalUser, totalStatus };
  }, [selectedTicker, apiDividends, userDividendsByTicker]);

  const sortedYears = useMemo(() => {
    if (!analysis) return [];
    const sorted = [...analysis.years];
    if (sortBy === 'year') sorted.sort((a, b) => b.year - a.year);
    else if (sortBy === 'diff') sorted.sort((a, b) => Math.abs(b.apiTotal - b.userTotal) - Math.abs(a.apiTotal - a.userTotal));
    else if (sortBy === 'status') {
      const ordem = { faltando: 0, parcial: 1, pendente: 2, ok: 3 };
      sorted.sort((a, b) => (ordem[a.status] || 9) - (ordem[b.status] || 9));
    }
    return sorted;
  }, [analysis, sortBy]);

  return (
    <div>
      <h1>Conferência de Dividendos</h1>
      <p className="subtitle">
        Compare os proventos registrados com o histórico oficial da B3 via brapi.dev
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{ color: '#CCC', fontSize: '0.9em' }}>Selecione o ativo:</span>
        <select
          value={selectedTicker}
          onChange={e => setSelectedTicker(e.target.value)}
          style={{
            background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #C8B800AA',
            borderRadius: 8, padding: '8px 14px', fontSize: '0.9em', fontFamily: 'inherit',
            cursor: 'pointer', outline: 'none', minWidth: 160, textAlign: 'center',
          }}
        >
          <option value="">Selecione...</option>
          {tickersCarteira.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {loading && <span style={{ color: '#C8B800', fontSize: '0.85em' }}>Buscando dados...</span>}
        {error && <span style={{ color: '#FF5555', fontSize: '0.85em' }}>Erro: {error}</span>}
      </div>

      {selectedTicker && !loading && analysis && (
        <>
          <div style={{
            display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap',
          }}>
            <div className="card-stats" style={{ flex: 1, minWidth: 180 }}>
              <span className="stat-label">Registrado por Você</span>
              <span className="stat-value" style={{ color: '#00CC66' }}>{formatCurrency(analysis.totalUser)}</span>
            </div>
            <div className="card-stats" style={{ flex: 1, minWidth: 180 }}>
              <span className="stat-label">Oficial (brapi.dev)</span>
              <span className="stat-value" style={{ color: '#C8B800' }}>{formatCurrency(analysis.totalApi)}</span>
            </div>
            <div className="card-stats" style={{ flex: 1, minWidth: 180 }}>
              <span className="stat-label">Diferença</span>
              <span className="stat-value" style={{
                color: analysis.totalStatus === 'ok' ? '#00CC66' : analysis.totalStatus === 'faltando' ? '#FF5555' : '#C8B800',
              }}>
                {formatCurrency(Math.abs(analysis.totalUser - analysis.totalApi))}
              </span>
              <span style={{
                fontSize: '0.75em', marginTop: 2,
                color: (statusCores[analysis.totalStatus] || statusCores.pendente).color,
              }}>
                {(statusCores[analysis.totalStatus] || statusCores.pendente).label}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          }}>
            <span style={{ color: '#888', fontSize: '0.85em' }}>Ordenar por:</span>
            {['year', 'diff', 'status'].map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                style={{
                  background: sortBy === s ? '#C8B80022' : 'transparent',
                  color: sortBy === s ? '#C8B800' : '#888',
                  border: `1px solid ${sortBy === s ? '#C8B80066' : '#333'}`,
                  borderRadius: 6, padding: '4px 12px', fontSize: '0.78em',
                  fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  transition: 'all 0.2s ease',
                }}
              >
                {s === 'year' ? 'Ano' : s === 'diff' ? 'Diferença' : 'Status'}
              </button>
            ))}
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 70 }}>ANO</th>
                  <th style={{ minWidth: 120 }}>REGISTRADO</th>
                  <th style={{ minWidth: 40, color: '#666' }}>Qtd</th>
                  <th style={{ minWidth: 120 }}>OFICIAL</th>
                  <th style={{ minWidth: 40, color: '#666' }}>Qtd</th>
                  <th style={{ minWidth: 120 }}>DIFERENÇA</th>
                  <th style={{ minWidth: 90 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {sortedYears.map(row => {
                  const st = statusCores[row.status] || statusCores.pendente;
                  const diff = Math.abs(row.apiTotal - row.userTotal);
                  return (
                    <tr key={row.year}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#C8B800' }}>
                        {row.year}
                      </td>
                      <td className="td-valor" style={{ color: '#00CC66' }}>
                        {row.userTotal > 0 ? formatCurrency(row.userTotal) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', color: '#666', fontSize: '0.85em' }}>
                        {row.userCount || '—'}
                      </td>
                      <td className="td-valor" style={{ color: '#C8B800' }}>
                        {row.apiTotal > 0 ? formatCurrency(row.apiTotal) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', color: '#666', fontSize: '0.85em' }}>
                        {row.apiCount || '—'}
                      </td>
                      <td className="td-valor" style={{ color: row.status === 'ok' ? '#00CC66' : '#FF5555' }}>
                        {diff > 0 ? formatCurrency(diff) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 12px', borderRadius: 6,
                          fontSize: '0.78em', fontWeight: 700,
                          background: st.bg, color: st.color,
                          border: `1px solid ${st.color}44`,
                        }}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {apiDividends.length > 0 && (
            <details style={{ marginTop: 24, background: '#151515', borderRadius: 10, border: '1px solid #2A2A2A', padding: 16 }}>
              <summary style={{ color: '#C8B800', fontWeight: 700, cursor: 'pointer', fontSize: '0.9em', letterSpacing: '1px' }}>
                📋 Histórico Oficial ({apiDividends.length} registro(s))
              </summary>
              <div className="table-wrapper" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 100 }}>DATA</th>
                      <th style={{ minWidth: 80 }}>TIPO</th>
                      <th style={{ minWidth: 120 }}>VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiDividends.slice(0, 50).map((d, i) => (
                      <tr key={i}>
                        <td className="td-data">{d.date}</td>
                        <td style={{ textAlign: 'center', color: d.type === 'JCP' ? '#C8B800' : '#00CC66' }}>
                          {d.type}
                        </td>
                        <td className="td-valor">{formatCurrency(d.value)}</td>
                      </tr>
                    ))}
                    {apiDividends.length > 50 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#666', padding: 12 }}>
                          ...e mais {apiDividends.length - 50} registro(s)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}

      {!selectedTicker && (
        <div className="page-placeholder" style={{ height: '60%' }}>
          <div className="icon">🔍</div>
          <h2>Conferência de Dividendos</h2>
          <p>Selecione um ativo para comparar os proventos registrados com o histórico oficial.</p>
        </div>
      )}
    </div>
  );
}

export default Conferencia;
