import { useMemo, useState, useEffect } from 'react';
import { formatCurrency, formatNumber } from '../services/format';
import { useTransactions } from '../context/TransactionsContext';
import { usePrices } from '../hooks/usePrices';
import LogoImage from '../components/LogoImage';

const typeIcons = {
  'Ação': '📈',
  'FII': '🏗️',
  'Renda Fixa': '🔒',
};

const typeColors = {
  'Ação': '#C8B800',
  'FII': '#CC8800',
  'Renda Fixa': '#0099CC',
};

const columns = [
  { key: 'imagem', label: 'Imagem', width: 50 },
  { key: 'ticker', label: 'Ticker', width: 80 },
  { key: 'ativo', label: 'Nome', width: 180 },
  { key: 'tipo', label: 'Tipo', width: 90 },
  { key: 'quantidade', label: 'Quantidade', width: 100 },
  { key: 'precoMedio', label: 'Preço Médio', width: 110 },
  { key: 'cotacao', label: 'Cotação', width: 100 },
  { key: 'investido', label: 'Investido', width: 110 },
  { key: 'atual', label: 'Atual', width: 110 },
  { key: 'rendimento', label: 'Rendimento', width: 110 },
  { key: 'resultado', label: 'Resultado', width: 110 },
  { key: 'acoes', label: 'Ações', width: 50 },
];

const currencySymbols = {
  'Dólar': '$',
  'Euro': '€',
};

function Carteira() {
  const { transactions } = useTransactions();
  const [editRf, setEditRf] = useState(null);
  const [editRfValue, setEditRfValue] = useState('');

  const [manualAtual, setManualAtual] = useState(() => {
    try { return JSON.parse(localStorage.getItem('investimento_rf_manual')) || {}; } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('investimento_rf_manual', JSON.stringify(manualAtual));
  }, [manualAtual]);

  const tickers = useMemo(() => {
    const base = [...new Set(transactions.map((t) => t.ticker))];
    const tipos = new Set(transactions.map((t) => t.tipo.replace(/Fii/g, 'FII')));
    if (tipos.has('Dólar') && !base.includes('USDBRL')) base.push('USDBRL');
    if (tipos.has('Euro') && !base.includes('EURBRL')) base.push('EURBRL');
    return base;
  }, [transactions]);

  const { prices, changes, loading } = usePrices(tickers);

  const portfolio = useMemo(() => {
    const groups = {};

    transactions.forEach((t) => {
      if (!groups[t.ticker]) {
        groups[t.ticker] = {
          ticker: t.ticker,
          ativo: t.ativo,
          tipo: t.tipo.replace(/Fii/g, 'FII'),
          qtdCompra: 0,
          qtdVenda: 0,
          investidoCompra: 0,
          investidoVenda: 0,
        };
      }
      const g = groups[t.ticker];
      if (t.operacao === 'Compra') {
        g.qtdCompra += t.quantidade;
        g.investidoCompra += t.investido;
      } else {
        g.qtdVenda += t.quantidade;
        g.investidoVenda += t.investido;
      }
    });

    return Object.values(groups).map((g) => {
      const quantidade = g.qtdCompra - g.qtdVenda;
      const investido = g.investidoCompra - g.investidoVenda;
      const precoMedio = quantidade > 0 ? investido / quantidade : 0;
      const isManual = ['Renda Fixa', 'Dólar', 'Euro'].includes(g.tipo);
      const cotacao = isManual && manualAtual[g.ticker] != null
        ? manualAtual[g.ticker] / quantidade
        : g.tipo === 'Dólar'
          ? prices['USDBRL']
          : g.tipo === 'Euro'
            ? prices['EURBRL']
            : prices[g.ticker];
      const variacao = changes[g.ticker] ?? 0;
      const atual = cotacao != null ? quantidade * cotacao : 0;
      const rendimento = investido !== 0
        ? ((atual - investido) / Math.abs(investido)) * 100
        : 0;
      const resultado = atual - investido;

      return { ...g, quantidade, investido, precoMedio, cotacao, variacao, atual, rendimento, resultado };
    }).filter((g) => g.quantidade > 0);
  }, [transactions, prices, changes, manualAtual]);



  const formatNumber = (v) =>
    v.toLocaleString('pt-BR');

  const handleOpenEditRf = (row) => {
    setEditRf(row);
    setEditRfValue(formatCurrency(row.atual));
  };

  const handleSaveRf = () => {
    if (!editRf) return;
    const raw = editRfValue.replace(/[R$\s.]/g, '').replace(',', '.');
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    setManualAtual(prev => ({ ...prev, [editRf.ticker]: val }));
    setEditRf(null);
  };

  const actionBtnStyle = {
    background: 'transparent', border: 'none', cursor: 'pointer',
    padding: '6px', borderRadius: '6px', transition: 'all 0.2s ease',
    fontSize: '1.1em', lineHeight: 1,
  };

  return (
    <div>
      <h1>Carteira</h1>
      <p className="subtitle">
        Posição consolidada por ativo
        {portfolio.length > 0 && (
          <span style={{ color: '#666666', marginLeft: '8px' }}>
            — {portfolio.length} ativo(s)
            {loading && <span style={{ color: '#C8B800', marginLeft: '8px' }}>atualizando...</span>}
          </span>
        )}
      </p>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {portfolio.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  Nenhum ativo na carteira.
                  Utilize os formulários de Compra para adicionar operações.
                </td>
              </tr>
            ) : (
              portfolio.map((row) => (
                <tr key={row.ticker}>
                  <td className="td-imagem">
                    <LogoImage
                      ticker={row.ticker}
                      fallback={typeIcons[row.tipo] || '📄'}
                      size={32}
                    />
                  </td>
                  <td className="td-ticker">{row.ticker}</td>
                  <td style={{ textAlign: 'center', color: '#E0E0E0' }}>{row.ativo}</td>
                  <td className="td-tipo">{row.tipo}</td>
                  <td className="td-numero">{formatNumber(row.quantidade)}</td>
                  <td className="td-valor">{formatCurrency(row.precoMedio)}</td>
                  <td className="td-valor">
                    {row.cotacao != null ? (
                      <>
                        <span>{currencySymbols[row.tipo] || 'R$'} {formatNumber(row.cotacao)}</span>
                        {row.variacao !== 0 && row.tipo !== 'Renda Fixa' && (
                          <span style={{
                            color: row.variacao >= 0 ? '#00CC66' : '#FF5555',
                            fontSize: '0.8em',
                            marginLeft: '6px',
                          }}>
                            {row.variacao >= 0 ? '▲' : '▼'} {Math.abs(row.variacao).toFixed(2)}%
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#666666' }}>—</span>
                    )}
                  </td>
                  <td className="td-valor">{formatCurrency(row.investido)}</td>
                  <td className="td-valor">{formatCurrency(row.atual)}</td>
                  <td className="td-valor" style={{ color: row.rendimento >= 0 ? '#00CC66' : '#FF5555' }}>
                    {row.rendimento >= 0 ? '+' : ''}{formatNumber(row.rendimento)}%
                  </td>
                  <td className="td-valor" style={{ color: row.resultado >= 0 ? '#00CC66' : '#FF5555' }}>
                    {row.resultado >= 0 ? '+' : ''}{formatCurrency(row.resultado)}
                  </td>
                  <td className="td-acoes">
                    {(row.tipo === 'Renda Fixa' || row.tipo === 'Dólar' || row.tipo === 'Euro') && (
                      <button
                        style={actionBtnStyle}
                        onClick={() => handleOpenEditRf(row)}
                        title="Editar valor atual"
                        className="btn-action edit"
                      >
                        ✏️
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Total de ativos: {portfolio.length}</span>
        {portfolio.length > 0 && (
          <>
            <span style={{ marginLeft: '20px', color: '#666666' }}>
              Total Investido:{' '}
              {formatCurrency(portfolio.reduce((acc, r) => acc + r.investido, 0))}
            </span>
            <span style={{ marginLeft: '20px', color: '#666666' }}>
              Total Atual:{' '}
              {formatCurrency(portfolio.reduce((acc, r) => acc + r.atual, 0))}
            </span>
          </>
        )}
      </div>

      {editRf && (
        <div className="modal-overlay" onClick={() => setEditRf(null)}>
          <div className="modal-content modal-edit" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Ativo - {editRf.ticker}</h2>
              <button className="modal-close" onClick={() => setEditRf(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8em', color: '#999', marginBottom: 4 }}>Ticker</label>
                  <input type="text" value={editRf.ticker} disabled style={{ width: '100%', padding: '10px 14px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8em', color: '#999', marginBottom: 4 }}>Nome</label>
                  <input type="text" value={editRf.ativo} disabled style={{ width: '100%', padding: '10px 14px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8em', color: '#999', marginBottom: 4 }}>Tipo</label>
                  <input type="text" value={editRf.tipo} disabled style={{ width: '100%', padding: '10px 14px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8em', color: '#999', marginBottom: 4 }}>Quantidade</label>
                  <input type="text" value={formatNumber(editRf.quantidade)} disabled style={{ width: '100%', padding: '10px 14px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8em', color: '#999', marginBottom: 4 }}>Preço Médio</label>
                  <input type="text" value={formatCurrency(editRf.precoMedio)} disabled style={{ width: '100%', padding: '10px 14px', background: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 8, color: '#666', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8em', color: '#C8B800', marginBottom: 4 }}>Atual (editável)</label>
                  <input
                    type="text"
                    value={editRfValue}
                    onChange={e => setEditRfValue(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', background: '#1A1A00', border: '1px solid #C8B80044', borderRadius: 8, color: '#FFF', fontFamily: 'inherit', fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setEditRf(null)}>Cancelar</button>
              <button className="btn btn-save" onClick={handleSaveRf}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Carteira;
