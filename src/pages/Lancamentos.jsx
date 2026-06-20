import { useState, useMemo, useRef, useEffect } from 'react';
import { formatCurrency } from '../services/format';
import { useTransactions } from '../context/TransactionsContext';
import { useUser } from '../context/UserContext';
import EditTransactionModal from '../components/Modals/EditTransactionModal';
import ConfirmModal from '../components/Modals/ConfirmModal';
import Toast from '../components/Toast';
import LogoImage from '../components/LogoImage';
import { listar as listarAtivos } from '../database/TickerCatalogService';
import * as XLSX from 'xlsx';

const columns = [
  { key: 'imagem', label: 'Imagem', width: 50 },
  { key: 'ticker', label: 'Ticker', width: 80 },
  { key: 'ativo', label: 'Nome', width: 180 },
  { key: 'cnpj', label: 'CNPJ', width: 150 },
  { key: 'tipo', label: 'Tipo', width: 90 },
  { key: 'segmento', label: 'Segmento', width: 120 },
  { key: 'operacao', label: 'Operação', width: 100 },
  { key: 'data', label: 'Data', width: 90 },
  { key: 'ano', label: 'Ano', width: 60 },
  { key: 'quantidade', label: 'Quantidade', width: 100 },
  { key: 'valor', label: 'Valor', width: 90 },
  { key: 'taxa', label: 'Taxa', width: 80 },
  { key: 'investido', label: 'Investido', width: 110 },
  { key: 'patrimonio', label: 'Patrimônio', width: 110 },
  { key: 'corretora', label: 'Corretora', width: 120 },
  { key: 'acoes', label: 'Ações', width: 80 },
];

const requiredCols = ['ticker', 'ativo', 'tipo', 'operacao', 'data', 'quantidade', 'valor'];
const knownCols = columns.map(c => c.key).filter(k => k !== 'imagem' && k !== 'acoes');
const columnAliases = {
  nome: 'ativo',
  empresa: 'ativo',
  acao: 'ticker',
  papel: 'ticker',
  codigo: 'ticker',
  ativo_ticker: 'ticker',
  preco: 'valor',
  'preço': 'valor',
  total: 'investido',
  qtde: 'quantidade',
  quant: 'quantidade',
  natureza: 'operacao',
  corretora: 'corretora',
  corretor: 'corretora',
  broker: 'corretora',
  instituicao: 'corretora',
  'instituição': 'corretora',
};

const corretoraPorTicker = {
  BBAS3: 'C6', TRXF11: 'C6', GARE11: 'C6', LTBX11: 'C6', XPML11: 'C6',
  SOFISA: 'SOFISA',
  RBOP11: 'XP', FGAA11: 'XP',
  MXRF11: 'XP', VSLH11: 'XP',
  VGHF11: 'XP', VGIP11: 'XP',
  KNCR11: 'XP',
  TAEE3: 'RICO', ITSA4: 'RICO', PETR4: 'RICO', VALE3: 'RICO',
  AMER3: 'RICO', BBDC3: 'RICO', BBDC4: 'RICO', BBSE3: 'RICO',
  BEES3: 'RICO', BRAP3: 'RICO', CMIN3: 'RICO', COCA34: 'RICO',
  ELET3: 'RICO', GOAU3: 'RICO', GOAU4: 'RICO', OIBR3: 'RICO',
  SANB3: 'RICO', SAPR3: 'RICO', TAEE11: 'RICO',
  DÓLAR: 'WISE', EURO: 'WISE',
};

const typeIcons = {
  'Ação': '📈',
  'FII': '🏗️',
  'Renda Fixa': '🔒',
};

// ─── Funções auxiliares fora do componente (estáveis, sem re-criação) ────────
function normalizeTipo(t) {
  if (!t) return '';
  const s = String(t).trim();
  if (s.toLowerCase() === 'fii') return 'FII';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────

const selectStyle = {
  background: '#0D0D0D',
  color: '#E0E0E0',
  border: '1px solid #C8B800AA',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: '0.75em',
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
  minWidth: 90,
};

function normalizeHeader(h) {
  return h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseBrazilNumber(v) {
  if (v == null || v === '') return NaN;
  if (typeof v === 'number') return v;
  const str = String(v).trim();
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function parseDate(v) {
  if (v == null || v === '') return '';
  // Excel serial date (number or numeric string)
  const num = typeof v === 'number' ? v : (String(v).trim().match(/^\d+$/) ? Number(v) : NaN);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d)) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  }
  const str = String(v).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m1) return `${m1[1].padStart(2, '0')}/${m1[2].padStart(2, '0')}/${m1[3]}`;
  // YYYY-MM-DD
  const m2 = str.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m2) return `${m2[3].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[1]}`;
  return str;
}

function Lancamentos() {
  const { transactions, addTransaction, updateTransaction, removeTransaction, clearTransactions } = useTransactions();
  const { userName } = useUser();
  const fileInputRef = useRef(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterTicker, setFilterTicker] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterOperacao, setFilterOperacao] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [massModal, setMassModal] = useState(null);
  const [massStatus, setMassStatus] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [ativosMap, setAtivosMap] = useState({});

  useEffect(() => {
    listarAtivos().then(data => {
      const map = {};
      data.forEach(a => { if (a.TICKER && a.IMAGEM) map[a.TICKER.toUpperCase()] = a.IMAGEM; });
      setAtivosMap(map);
    });
  }, []);

  const uniqueTickers = useMemo(() => {
    return [...new Set(transactions.map(t => t.ticker))].filter(Boolean).sort();
  }, [transactions]);

  const uniqueTipos = useMemo(() => {
    return [...new Set(transactions.map(t => normalizeTipo(t.tipo)))].filter(Boolean).sort();
  }, [transactions]);

  const uniqueOperacoes = useMemo(() => {
    return [...new Set(transactions.map(t => t.operacao))].filter(Boolean).sort();
  }, [transactions]);

  const uniqueAnos = useMemo(() => {
    return [...new Set(transactions.map(t => t.ano))].filter(Boolean).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (filterTicker && t.ticker !== filterTicker) return false;
        if (filterTipo && normalizeTipo(t.tipo) !== filterTipo) return false;
        if (filterOperacao && t.operacao !== filterOperacao) return false;
        if (filterAno && String(t.ano) !== String(filterAno)) return false;
        return true;
      })
      .sort((a, b) => {
        try {
          if (!a.data || !b.data) return 0;
          const [da, ma, ya] = String(a.data).split('/').map(Number);
          const [db, mb, yb] = String(b.data).split('/').map(Number);
          const ta = new Date(ya, ma - 1, da);
          const tb = new Date(yb, mb - 1, db);
          if (isNaN(ta) || isNaN(tb)) return 0;
          return tb - ta;
        } catch {
          return 0;
        }
      });
  }, [transactions, filterTicker, filterTipo, filterOperacao, filterAno]);

  const formatNumber = (v) =>
    v.toLocaleString('pt-BR');

  const formatDate = (str) => {
    if (!str) return '';
    const [d, m, y] = str.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt)) return str;
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleEdit = (row) => setEditTarget(row);

  const handleSaveEdit = (data) => {
    updateTransaction(editTarget.id, data);
    setEditTarget(null);
  };

  const handleUpdateMultiple = (ids, updates) => {
    ids.forEach((id) => updateTransaction(id, updates));
    setEditTarget(null);
  };

  const handleDeleteClick = (row) => setDeleteTarget(row);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      removeTransaction(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

        if (!rows.length) {
          setMassStatus({ type: 'error', msg: 'A planilha está vazia.' });
          return;
        }

        // Auto-detect header row: find the row with most matches to known columns
        let bestRowIdx = -1;
        let bestScore = 0;
        rows.forEach((row, idx) => {
          const score = row.filter(cell => {
            if (!cell || typeof cell !== 'string') return false;
            const n = normalizeHeader(cell);
            if (knownCols.includes(n)) return true;
            if (columnAliases[n]) return true;
            return false;
          }).length;
          if (score > bestScore) {
            bestScore = score;
            bestRowIdx = idx;
          }
        });

        if (bestRowIdx === -1) {
          setMassStatus({ type: 'error', msg: 'Não foi possível encontrar a linha de cabeçalho na planilha.' });
          return;
        }

        const rawHeaders = rows[bestRowIdx];
        const rawDataRows = rows.slice(bestRowIdx + 1).filter(r => r.some(c => c !== ''));

        // Build header map: normalize each header and match to known column
        const headerMap = {};
        rawHeaders.forEach((h, idx) => {
          if (!h || typeof h !== 'string') return;
          const n = normalizeHeader(h);
          const target = columnAliases[n] || n;
          if (knownCols.includes(target)) {
            headerMap[target] = idx;
          }
        });

        const foundCols = Object.keys(headerMap);
        const missingReq = requiredCols.filter(c => !foundCols.includes(c));
        const missingOpt = knownCols.filter(c => !foundCols.includes(c));

        setMassModal({
          totalRows: rawDataRows.length,
          foundCols,
          missingReq,
          missingOpt,
          headerMap,
          rawData: rawDataRows,
        });
      } catch (err) {
        setMassStatus({ type: 'error', msg: `Erro ao ler o arquivo: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleConfirmMassUpload = () => {
    if (!massModal) return;
    const { headerMap, rawData } = massModal;
    let added = 0;
    rawData.forEach(row => {
      function cell(key) { return row[headerMap[key]]; }

      const ticker = String(cell('ticker') || '').trim().toUpperCase();
      const ativo = String(cell('ativo') || '').trim();
      const tipo = String(cell('tipo') || '').trim();
      const operacao = String(cell('operacao') || '').trim();
      const data = parseDate(cell('data'));
      const quantidade = parseBrazilNumber(cell('quantidade'));
      const valor = parseBrazilNumber(cell('valor'));
      const taxa = parseBrazilNumber(cell('taxa')) || 0;
      const investido = parseBrazilNumber(cell('investido')) || (quantidade * valor + taxa);
      const patrimonio = parseBrazilNumber(cell('patrimonio')) || investido;
      const cnpj = String(cell('cnpj') || '').trim();
      const segmento = String(cell('segmento') || '').trim();
      const corretora = String(cell('corretora') || '').trim();
      const ano = cell('ano') != null ? parseInt(cell('ano'), 10) : (data ? parseInt(data.split('/')[2], 10) : new Date().getFullYear());

      if (!ticker || !ativo || !tipo || !operacao || !data || isNaN(quantidade) || isNaN(valor)) return;

      addTransaction({
        imagem: null,
        ticker,
        ativo,
        cnpj,
        tipo: tipo.replace(/fii/i, 'FII'),
        segmento,
        operacao: operacao.charAt(0).toUpperCase() + operacao.slice(1).toLowerCase(),
        data,
        ano,
        quantidade,
        valor,
        taxa,
        investido: isNaN(investido) ? 0 : investido,
        patrimonio: isNaN(patrimonio) ? 0 : patrimonio,
        corretora,
      });
      added++;
    });
    setMassModal(null);
    setMassStatus({ type: 'success', msg: `${added} lançamento(s) importado(s) com sucesso!` });
  };

  const actionBtnStyle = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    fontSize: '1.1em',
    lineHeight: 1,
  };

  return (
    <div style={{ height: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '10px', marginTop: '-55px' }}>
      <h1>Lançamentos</h1>
      <p className="subtitle">
        Registro de todas as operações de compra e venda
        {transactions.length > 0 && (
          <span style={{ color: '#666666', marginLeft: '8px' }}>
            — {transactions.length} registro(s)
          </span>
        )}
      </p>

      <div className="filters-row" style={{
        display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterTicker} onChange={e => setFilterTicker(e.target.value)} style={selectStyle}>
            <option value="">TICKER: Todos</option>
            {uniqueTickers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={selectStyle}>
            <option value="">TIPO: Todos</option>
            {uniqueTipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterOperacao} onChange={e => setFilterOperacao(e.target.value)} style={selectStyle}>
            <option value="">OPERAÇÃO: Todos</option>
            {uniqueOperacoes.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterAno} onChange={e => setFilterAno(e.target.value)} style={selectStyle}>
            <option value="">ANO: Todos</option>
            {uniqueAnos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setClearConfirm(true)}
            style={{
              background: '#FF3333', color: '#FFFFFF', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontSize: '0.75em', fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', letterSpacing: '1px', lineHeight: 1.3,
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => e.target.style.background = '#FF5555'}
            onMouseOut={e => e.target.style.background = '#FF3333'}
          >
            EXCLUIR<br />TABELA
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#C8B800', color: '#0A0A0A', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontSize: '0.75em', fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', letterSpacing: '1px', lineHeight: 1.3,
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => e.target.style.background = '#E8D844'}
            onMouseOut={e => e.target.style.background = '#C8B800'}
          >
            IMPORTAR<br />PLANILHA
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Modal de confirmação de importação */}
      {massModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-edit">
            <div className="modal-header">
              <h2>Importar Lançamentos</h2>
              <button className="modal-close" onClick={() => setMassModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#E0E0E0', marginBottom: 16, lineHeight: 1.6 }}>
                A planilha deve conter no mínimo as colunas:{' '}
                <strong style={{ color: '#C8B800' }}>{requiredCols.map(c => c === 'ativo' ? 'nome' : c).join(', ')}</strong>
              </p>
              <div style={{ background: '#0D0D0D', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ color: '#E0E0E0', marginBottom: 8 }}>
                  <strong>{massModal.totalRows}</strong> linha(s) encontrada(s)
                </p>
                <p style={{ color: '#999999', fontSize: '0.9em', marginBottom: 4 }}>
                  Colunas encontradas: <span style={{ color: '#00CC66' }}>{massModal.foundCols.map(c => c === 'ativo' ? 'nome' : c).join(', ') || '—'}</span>
                </p>
                {massModal.missingReq.length > 0 && (
                  <p style={{ color: '#FF5555', fontSize: '0.9em', marginBottom: 4 }}>
                    Colunas obrigatórias ausentes: {massModal.missingReq.map(c => c === 'ativo' ? 'nome' : c).join(', ')}
                  </p>
                )}
                {massModal.missingOpt.length > 0 && (
                  <p style={{ color: '#CC8800', fontSize: '0.9em' }}>
                    Colunas opcionais ausentes: {massModal.missingOpt.map(c => c === 'ativo' ? 'nome' : c).join(', ')}
                  </p>
                )}
              </div>
              {massModal.missingReq.length > 0 && (
                <p style={{ color: '#FF5555', fontSize: '0.9em', marginBottom: 16 }}>
                  As colunas obrigatórias ausentes serão ignoradas. Deseja continuar mesmo assim?
                </p>
              )}
              <p style={{ color: '#E0E0E0', fontSize: '0.95em' }}>
                {userName}, deseja importar {massModal.totalRows} lançamento(s)?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setMassModal(null)}>Cancelar</button>
              <button className="btn btn-save" onClick={handleConfirmMassUpload}>
                Importar {massModal.totalRows} lançamento(s)
              </button>
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

      <div className="table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  Nenhum lançamento encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={row.operacao === 'Venda' ? 'row-venda' : ''}>
                  <td className="td-imagem">
                    {(() => {
                      const imgUrl = ativosMap[row.ticker?.toUpperCase()];
                      const logo = <LogoImage ticker={row.ticker} fallback={row.imagem || typeIcons[normalizeTipo(row.tipo)]} size={32} />;
                      return imgUrl ? <a href={imgUrl} target="_blank" rel="noopener noreferrer">{logo}</a> : logo;
                    })()}
                  </td>
                  <td className="td-ticker">{row.ticker}</td>
                  <td className="td-ativo">{row.ativo}</td>
                  <td className="td-cnpj">{row.cnpj}</td>
                  <td className="td-tipo">{normalizeTipo(row.tipo)}</td>
                  <td className="td-segmento">{row.segmento}</td>
                  <td>
                    <span className={`operacao-badge ${row.operacao === 'Compra' ? 'compra' : 'venda'}`}>
                      {row.operacao}
                    </span>
                  </td>
                  <td className="td-data">{formatDate(row.data)}</td>
                  <td className="td-ano">{row.ano}</td>
                  <td className="td-numero">{formatNumber(row.quantidade)}</td>
                  <td className="td-valor">{formatCurrency(row.valor)}</td>
                  <td className="td-valor">{formatCurrency(row.taxa)}</td>
                  <td className="td-valor">{formatCurrency(row.investido)}</td>
                  <td className="td-valor">{formatCurrency(row.investido - row.taxa)}</td>
                  <td className="td-corretora">{corretoraPorTicker[row.ticker] || row.corretora || '-'}</td>
                  <td className="td-acoes">
                    <button style={actionBtnStyle} onClick={() => handleEdit(row)} title="Editar lançamento" className="btn-action edit">✏️</button>
                    <button style={actionBtnStyle} onClick={() => handleDeleteClick(row)} title="Excluir lançamento" className="btn-action delete">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <EditTransactionModal
          data={editTarget}
          transactions={transactions}
          onSave={handleSaveEdit}
          onUpdateMultiple={handleUpdateMultiple}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`${userName}, tem certeza que deseja excluir o lançamento de ${deleteTarget.ticker} (${deleteTarget.operacao})?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {clearConfirm && (
        <div className="modal-overlay">
          <div className="modal-content modal-confirm">
            <div className="modal-header">
              <h2>Excluir Tabela</h2>
              <button className="modal-close" onClick={() => setClearConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#E0E0E0', lineHeight: 1.6 }}>
                Todas as informações da tabela serão excluídas definitivamente sem possibilidade de desfazer, deseja realmente continuar?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setClearConfirm(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => { clearTransactions(); setClearConfirm(false); }}>
                Sim, excluir tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lancamentos;
