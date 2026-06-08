import { useMemo, useState, useEffect } from 'react';
import { formatCurrency, formatNumber } from '../services/format';
import { useTransactions } from '../context/TransactionsContext';
import { usePrices } from '../hooks/usePrices';
import LogoImage from '../components/LogoImage';
import Toast from '../components/Toast';
import { getTickerInfo, saveTickerInfo } from '../services/tickerRegistry';

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
  const { transactions, updateTransaction } = useTransactions();
  const [editRf, setEditRf] = useState(null);
  const [editRfValue, setEditRfValue] = useState('');
  const [linkAsset, setLinkAsset] = useState(null);
  const [linkValue, setLinkValue] = useState('');
  const [imageValue, setImageValue] = useState('');

  const [manualAtual, setManualAtual] = useState(() => {
    try { return JSON.parse(localStorage.getItem('investimento_rf_manual')) || {}; } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('investimento_rf_manual', JSON.stringify(manualAtual));
  }, [manualAtual]);

  const [restructureType, setRestructureType] = useState(null);
  const [restructureTicker, setRestructureTicker] = useState('');
  const [restructureFactor, setRestructureFactor] = useState(1);
  const [showRestructureConfirm, setShowRestructureConfirm] = useState(false);
  const [massStatus, setMassStatus] = useState(null);

  const uniqueTickers = useMemo(() => [...new Set(transactions.map(t => t.ticker))].sort(), [transactions]);

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
      const changeKey = g.tipo === 'Dólar' ? 'USDBRL' : g.tipo === 'Euro' ? 'EURBRL' : g.ticker;
      const variacao = changes[changeKey] ?? 0;
      const atual = cotacao != null ? quantidade * cotacao : 0;
      const rendimento = investido !== 0
        ? ((atual - investido) / Math.abs(investido)) * 100
        : 0;
      const resultado = atual - investido;

      return { ...g, quantidade, investido, precoMedio, cotacao, variacao, changeKey, atual, rendimento, resultado };
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
    const existing = JSON.parse(localStorage.getItem('investimento_rf_manual') || '{}');
    localStorage.setItem('investimento_rf_manual', JSON.stringify({ ...existing, [editRf.ticker]: val }));
    setEditRf(null);
  };

  const handleOpenLinkAsset = (row) => {
    const info = getTickerInfo(row.ticker);
    setLinkAsset(row);
    setLinkValue(info?.link || '');
    setImageValue(info?.imagem || '');
  };

  const handleSaveLink = async () => {
    if (!linkAsset) return;
    try {
      const tickerUpper = linkAsset.ticker.toUpperCase().trim();
      await saveTickerInfo(tickerUpper, {
        nome: linkAsset.ativo,
        tipo: linkAsset.tipo,
        link: linkValue.trim(),
        imagem: imageValue.trim()
      });
      setLinkAsset(null);
      setMassStatus({ type: 'success', msg: `Informações de ${linkAsset.ticker} salvas com sucesso!` });
    } catch (e) {
      setMassStatus({ type: 'error', msg: 'Erro ao salvar as informações!' });
    }
  };

  const handleVisitLink = () => {
    if (!linkValue) return;
    let url = linkValue.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    window.open(url, '_blank');
  };

  const applyRestructure = () => {
    const factor = restructureFactor;
    const ticker = restructureTicker;
    let count = 0;
    transactions.forEach(t => {
      if (t.ticker !== ticker) return;
      const newQuantidade = restructureType === 'agrupamento'
        ? t.quantidade / factor
        : t.quantidade * factor;
      const newValor = restructureType === 'agrupamento'
        ? t.valor * factor
        : t.valor / factor;
      updateTransaction(t.id, {
        quantidade: Math.round(newQuantidade * 100) / 100,
        valor: Math.round(newValor * 100) / 100,
        investido: Math.round(newQuantidade * newValor * 100) / 100,
      });
      count++;
    });
    setRestructureType(null);
    setShowRestructureConfirm(false);
    setMassStatus({ type: 'success', msg: `${count} registro(s) atualizado(s) para ${ticker}!` });
  };

  const actionBtnStyle = {
    background: 'transparent', border: 'none', cursor: 'pointer',
    padding: '6px', borderRadius: '6px', transition: 'all 0.2s ease',
    fontSize: '1.1em', lineHeight: 1,
  };

  return (
    <div>
      <h1>Carteira</h1>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 20 }}>
        <p className="subtitle" style={{ margin: 0, flex: 1 }}>
          Posição consolidada por ativo
          {portfolio.length > 0 && (
            <span style={{ color: '#666666', marginLeft: '8px' }}>
              — {portfolio.length} ativo(s)
              {loading && <span style={{ color: '#C8B800', marginLeft: '8px' }}>atualizando...</span>}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
          onClick={() => {
            setRestructureType('agrupamento');
            setRestructureTicker('');
            setRestructureFactor(1);
            setShowRestructureConfirm(false);
          }}
          style={{
            background: '#2A7A3A', color: '#FFFFFF', border: 'none', borderRadius: 8,
            padding: '10px 22px', fontSize: '0.85em', fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => e.target.style.background = '#3A9A4A'}
          onMouseOut={e => e.target.style.background = '#2A7A3A'}
        >
          AGRUPAMENTO
        </button>
        <button
          onClick={() => {
            setRestructureType('desdobramento');
            setRestructureTicker('');
            setRestructureFactor(1);
            setShowRestructureConfirm(false);
          }}
          style={{
            background: '#7A5A2A', color: '#FFFFFF', border: 'none', borderRadius: 8,
            padding: '10px 22px', fontSize: '0.85em', fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => e.target.style.background = '#9A7A3A'}
          onMouseOut={e => e.target.style.background = '#7A5A2A'}
        >
          DESDOBRAMENTO
        </button>
        </div>
      </div>

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
                        {row.tipo !== 'Renda Fixa' && (
                          <span style={{
                            color: row.variacao >= 0 ? '#00CC66' : '#FF5555',
                            fontSize: '0.8em',
                            marginLeft: '6px',
                          }}>
                            {row.variacao > 0 ? '▲' : row.variacao < 0 ? '▼' : '•'} {Math.abs(row.variacao).toFixed(2)}%
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
                  <td className="td-acoes" style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                    <button
                      style={{
                        ...actionBtnStyle,
                        color: getTickerInfo(row.ticker)?.link ? '#00E5FF' : '#888899',
                        filter: getTickerInfo(row.ticker)?.link ? 'drop-shadow(0 0 4px rgba(0,229,255,0.4))' : 'none'
                      }}
                      onClick={() => handleOpenLinkAsset(row)}
                      title={getTickerInfo(row.ticker)?.link ? "Ver/Editar Link (Ativo)" : "Adicionar Link de Internet"}
                      className="btn-action link"
                    >
                      🔗
                    </button>
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

      {restructureType && !showRestructureConfirm && (
        <div className="modal-overlay">
          <div className="modal-content modal-edit" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>{restructureType === 'agrupamento' ? 'Agrupamento' : 'Desdobramento'}</h2>
              <button className="modal-close" onClick={() => setRestructureType(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: '#999999', fontSize: '0.8em', marginBottom: 4 }}>
                  Selecione o ativo
                </label>
                <select
                  value={restructureTicker}
                  onChange={e => setRestructureTicker(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0A0A0A',
                    border: '1px solid #2A2A2A', borderRadius: 6, color: '#E0E0E0',
                    fontSize: '0.9em', fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="">Selecione um ativo</option>
                  {uniqueTickers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {restructureType === 'agrupamento' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ color: '#E0E0E0', fontWeight: 600 }}>Converter</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={restructureFactor}
                    onChange={e => setRestructureFactor(Number(e.target.value) || 1)}
                    style={{
                      width: 80, padding: '8px 10px', background: '#0A0A0A',
                      border: '1px solid #C8B800AA', borderRadius: 6, color: '#E0E0E0',
                      fontSize: '1em', fontFamily: 'inherit', textAlign: 'center', outline: 'none',
                    }}
                  />
                  <span style={{ color: '#E0E0E0', fontWeight: 600 }}>ativos em</span>
                  <input
                    type="number"
                    value={1}
                    disabled
                    style={{
                      width: 60, padding: '8px 10px', background: '#1A1A1A',
                      border: '1px solid #2A2A2A', borderRadius: 6, color: '#666666',
                      fontSize: '1em', fontFamily: 'inherit', textAlign: 'center', outline: 'none',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ color: '#E0E0E0', fontWeight: 600 }}>Converter</span>
                  <input
                    type="number"
                    value={1}
                    disabled
                    style={{
                      width: 60, padding: '8px 10px', background: '#1A1A1A',
                      border: '1px solid #2A2A2A', borderRadius: 6, color: '#666666',
                      fontSize: '1em', fontFamily: 'inherit', textAlign: 'center', outline: 'none',
                    }}
                  />
                  <span style={{ color: '#E0E0E0', fontWeight: 600 }}>ativo em</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={restructureFactor}
                    onChange={e => setRestructureFactor(Number(e.target.value) || 1)}
                    style={{
                      width: 80, padding: '8px 10px', background: '#0A0A0A',
                      border: '1px solid #C8B800AA', borderRadius: 6, color: '#E0E0E0',
                      fontSize: '1em', fontFamily: 'inherit', textAlign: 'center', outline: 'none',
                    }}
                  />
                </div>
              )}

              <p style={{ color: '#E0E0E0', fontSize: '0.9em', lineHeight: 1.6, background: '#0D0D0D', borderRadius: 8, padding: 12 }}>
                {restructureType === 'agrupamento' ? (
                  <>Você está agrupando <strong style={{ color: '#C8B800' }}>{restructureFactor}</strong> cotas do ativo <strong style={{ color: '#C8B800' }}>{restructureTicker}</strong> em apenas <strong style={{ color: '#C8B800' }}>1</strong> cota. Todos os lançamentos anteriores serão convertidos para essa nova condição.</>
                ) : (
                  <>Você está desdobrando <strong style={{ color: '#C8B800' }}>1</strong> cota do ativo <strong style={{ color: '#C8B800' }}>{restructureTicker}</strong> em <strong style={{ color: '#C8B800' }}>{restructureFactor}</strong> cotas. Todos os lançamentos anteriores serão convertidos para essa nova condição.</>
                )}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setRestructureType(null)}>Cancelar</button>
              <button className="btn btn-save" onClick={() => setShowRestructureConfirm(true)}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showRestructureConfirm && (
        <div className="modal-overlay">
          <div className="modal-content modal-confirm">
            <div className="modal-header">
              <h2>Confirmar {restructureType === 'agrupamento' ? 'Agrupamento' : 'Desdobramento'}</h2>
              <button className="modal-close" onClick={() => { setShowRestructureConfirm(false); setRestructureType(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#E0E0E0', lineHeight: 1.6 }}>
                {restructureType === 'agrupamento'
                  ? `Deseja realmente agrupar ${restructureFactor} cotas de ${restructureTicker} em 1 cota?`
                  : `Deseja realmente desdobrar 1 cota de ${restructureTicker} em ${restructureFactor} cotas?`}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => { setShowRestructureConfirm(false); setRestructureType(null); }}>Não, cancelar</button>
              <button className="btn btn-save" onClick={applyRestructure}>Sim, salvar</button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={massStatus?.msg || ''}
        visible={!!massStatus}
        onClose={() => setMassStatus(null)}
        color={massStatus?.type === 'success' ? '#00CC66' : '#FF5555'}
        direction="right"
      />

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

      {linkAsset && (
        <div className="modal-overlay" onClick={() => setLinkAsset(null)}>
          <div className="modal-content modal-edit" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>Link e Detalhes do Ativo - {linkAsset.ticker}</h2>
              <button className="modal-close" onClick={() => setLinkAsset(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Ticker</label>
                  <input type="text" value={linkAsset.ticker} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Nome</label>
                  <input type="text" value={linkAsset.ativo} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Tipo</label>
                  <input type="text" value={linkAsset.tipo} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Quantidade</label>
                  <input type="text" value={formatNumber(linkAsset.quantidade)} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Preço Médio</label>
                  <input type="text" value={formatCurrency(linkAsset.precoMedio)} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Investido</label>
                  <input type="text" value={formatCurrency(linkAsset.investido)} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Atual</label>
                  <input type="text" value={formatCurrency(linkAsset.atual)} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: '#777', fontFamily: 'inherit', fontSize: '0.85em' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Rendimento</label>
                  <input type="text" value={`${linkAsset.rendimento >= 0 ? '+' : ''}${formatNumber(linkAsset.rendimento)}%`} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: linkAsset.rendimento >= 0 ? '#00CC66' : '#FF5555', fontFamily: 'inherit', fontSize: '0.85em', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75em', color: '#888', marginBottom: 4 }}>Resultado</label>
                  <input type="text" value={`${linkAsset.resultado >= 0 ? '+' : ''}${formatCurrency(linkAsset.resultado)}`} disabled style={{ width: '100%', padding: '8px 12px', background: '#070707', border: '1px solid #1a1a1a', borderRadius: 6, color: linkAsset.resultado >= 0 ? '#00CC66' : '#FF5555', fontFamily: 'inherit', fontSize: '0.85em', fontWeight: 600 }} />
                </div>
              </div>

              <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: 8, padding: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85em', color: '#00E5FF', fontWeight: 700, marginBottom: 8, letterSpacing: '0.5px' }}>
                  Link da Internet para o Ativo (Editável)
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Ex: https://statusinvest.com.br/acoes/petr4"
                    value={linkValue}
                    onChange={e => setLinkValue(e.target.value)}
                    style={{
                      flex: 1, padding: '10px 14px', background: '#121212',
                      border: '1px solid #00E5FF33', borderRadius: 6, color: '#FFF',
                      fontFamily: 'inherit', fontSize: '0.9em', outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#00E5FF'}
                    onBlur={e => e.target.style.borderColor = '#00E5FF33'}
                  />
                  <button
                    type="button"
                    onClick={handleVisitLink}
                    disabled={!linkValue}
                    style={{
                      padding: '10px 16px', background: linkValue ? '#00E5FF' : '#222',
                      color: linkValue ? '#000' : '#555', border: 'none', borderRadius: 6,
                      fontSize: '0.85em', fontWeight: 700, cursor: linkValue ? 'pointer' : 'default',
                      transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    🔗 Acessar
                  </button>
                </div>
                <small style={{ display: 'block', marginTop: 6, color: '#555566', fontSize: '0.75em' }}>
                  Adicione o link do site do ativo, StatusInvest, Fundamentus ou qualquer outra fonte para abrir com 1 clique.
                </small>
              </div>

              <div style={{ background: '#0A0A0A', border: '1px solid #222', borderRadius: 8, padding: 16, marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85em', color: '#C8B800', fontWeight: 700, marginBottom: 8, letterSpacing: '0.5px' }}>
                  Link da Imagem / Logo do Ativo (Editável)
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Ex: https://dominio.com/logo.png"
                    value={imageValue}
                    onChange={e => setImageValue(e.target.value)}
                    style={{
                      flex: 1, padding: '10px 14px', background: '#121212',
                      border: '1px solid #C8B80033', borderRadius: 6, color: '#FFF',
                      fontFamily: 'inherit', fontSize: '0.9em', outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = '#C8B800'}
                    onBlur={e => e.target.style.borderColor = '#C8B80033'}
                  />
                  {imageValue && (
                    <LogoImage ticker={linkAsset.ticker} size={36} fallback={linkAsset.ticker[0]} style={{ border: '1px solid #444', borderRadius: 6, background: '#111', flexShrink: 0 }} />
                  )}
                </div>
                <small style={{ display: 'block', marginTop: 6, color: '#555566', fontSize: '0.75em' }}>
                  Cole o link de uma imagem da internet para personalizar o logotipo do ativo. A visualização atualizará instantaneamente.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setLinkAsset(null)}>Cancelar</button>
              <button className="btn btn-save" onClick={handleSaveLink} style={{ background: '#00E5FF', color: '#000' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Carteira;
