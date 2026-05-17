import { formatCurrency } from '../services/format';
import { useState, useMemo, useRef } from 'react';
import { useProventos } from '../context/ProventosContext';
import { useUser } from '../context/UserContext';
import EditProventoModal from '../components/Modals/EditProventoModal';
import ConfirmModal from '../components/Modals/ConfirmModal';
import Toast from '../components/Toast';
import * as XLSX from 'xlsx';

const columns = [
  { key: 'ticker', label: 'TICKER', width: 90 },
  { key: 'nome', label: 'NOME', width: 200 },
  { key: 'tipo', label: 'TIPO', width: 90 },
  { key: 'data', label: 'DATA', width: 100 },
  { key: 'ano', label: 'ANO', width: 70 },
  { key: 'dividendos', label: 'DIVIDENDOS', width: 120 },
  { key: 'jcp', label: 'JCP', width: 120 },
  { key: 'rendimento', label: 'RENDIMENTO', width: 120 },
  { key: 'reembolso', label: 'REEMBOLSO', width: 120 },
  { key: 'montante', label: 'MONTANTE', width: 120 },
  { key: 'observacao', label: 'OBSERVAÇÃO', width: 200 },
  { key: 'acoes', label: 'AÇÕES', width: 80 },
];

const requiredCols = ['ticker', 'nome', 'tipo', 'data', 'dividendos', 'jcp', 'rendimento', 'reembolso'];
const knownCols = columns.map(c => c.key).filter(k => k !== 'montante' && k !== 'acoes');

const selectStyle = {
  background: '#0D0D0D',
  color: '#E0E0E0',
  border: '1px solid #C8B800AA',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: '0.85em',
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
  minWidth: 120,
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
  const num = typeof v === 'number' ? v : (String(v).trim().match(/^\d+$/) ? Number(v) : NaN);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d)) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  }
  const str = String(v).trim();
  const m1 = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m1) return `${m1[1].padStart(2, '0')}/${m1[2].padStart(2, '0')}/${m1[3]}`;
  const m2 = str.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m2) return `${m2[3].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[1]}`;
  return str;
}

const headerAliases = {
  empresa: 'nome',
  ativo: 'nome',
  proventos: 'dividendos',
  'jcp': 'jcp',
  'rendimento': 'rendimento',
  'reembolso': 'reembolso',
  'montante': 'montante',
};

function Proventos() {
  const { proventos, addProvento, updateProvento, removeProvento, clearProventos } = useProventos();
  const { userName } = useUser();
  const fileInputRef = useRef(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterTicker, setFilterTicker] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [filterDividendos, setFilterDividendos] = useState('');
  const [filterJcp, setFilterJcp] = useState('');
  const [filterRendimento, setFilterRendimento] = useState('');
  const [filterReembolso, setFilterReembolso] = useState('');
  const [massModal, setMassModal] = useState(null);
  const [massStatus, setMassStatus] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  const uniqueTickers = useMemo(() => [...new Set(proventos.map(p => p.ticker))].sort(), [proventos]);
  const uniqueAnos = useMemo(() => [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a), [proventos]);

  const filtered = useMemo(() => {
    return proventos.filter(p => {
      if (filterTicker && p.ticker !== filterTicker) return false;
      if (filterAno && Number(p.ano) !== Number(filterAno)) return false;
      if (filterDividendos === 'sim' && (!p.dividendos || p.dividendos <= 0)) return false;
      if (filterDividendos === 'nao' && p.dividendos && p.dividendos > 0) return false;
      if (filterJcp === 'sim' && (!p.jcp || p.jcp <= 0)) return false;
      if (filterJcp === 'nao' && p.jcp && p.jcp > 0) return false;
      if (filterRendimento === 'sim' && (!p.rendimento || p.rendimento <= 0)) return false;
      if (filterRendimento === 'nao' && p.rendimento && p.rendimento > 0) return false;
      if (filterReembolso === 'sim' && (!p.reembolso || p.reembolso <= 0)) return false;
      if (filterReembolso === 'nao' && p.reembolso && p.reembolso > 0) return false;
      return true;
    }).sort((a, b) => {
      const [da, ma, ya] = a.data.split('/').map(Number);
      const [db, mb, yb] = b.data.split('/').map(Number);
      const ta = new Date(ya, ma - 1, da);
      const tb = new Date(yb, mb - 1, db);
      return tb - ta;
    });
  }, [proventos, filterTicker, filterAno, filterDividendos, filterJcp, filterRendimento, filterReembolso]);



  const calcMontante = (row) =>
    (row.dividendos || 0) + (row.jcp || 0) + (row.rendimento || 0) + (row.reembolso || 0);

  const formatDate = (str) => {
    if (!str) return '';
    const [d, m, y] = str.split('/').map(Number);
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt)) return str;
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleEdit = (row) => setEditTarget(row);

  const handleSaveEdit = (data) => {
    updateProvento(editTarget.id, data);
    setEditTarget(null);
  };

  const handleDeleteClick = (row) => setDeleteTarget(row);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      removeProvento(deleteTarget.id);
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

        let bestRowIdx = -1;
        let bestScore = 0;
        rows.forEach((row, idx) => {
          const score = row.filter(cell => {
            if (!cell || typeof cell !== 'string') return false;
            const n = normalizeHeader(cell);
            if (knownCols.includes(n)) return true;
            if (headerAliases[n]) return true;
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

        const headerMap = {};
        rawHeaders.forEach((h, idx) => {
          if (!h || typeof h !== 'string') return;
          const n = normalizeHeader(h);
          const target = headerAliases[n] || n;
          if (knownCols.includes(target)) {
            headerMap[target] = idx;
          }
        });

        const foundCols = Object.keys(headerMap);
        const missingReq = requiredCols.filter(c => !foundCols.includes(c));

        setMassModal({
          totalRows: rawDataRows.length,
          foundCols,
          missingReq,
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
      const nome = String(cell('nome') || cell('ativo') || '').trim();
      const tipo = String(cell('tipo') || '').trim();
      const data = parseDate(cell('data'));
      const ano = cell('ano') != null ? parseInt(cell('ano'), 10) : (data ? parseInt(data.split('/')[2], 10) : new Date().getFullYear());
      const dividendos = parseBrazilNumber(cell('dividendos')) || 0;
      const jcp = parseBrazilNumber(cell('jcp')) || 0;
      const rendimento = parseBrazilNumber(cell('rendimento')) || 0;
      const reembolso = parseBrazilNumber(cell('reembolso')) || 0;
      const observacao = String(cell('observacao') || '').trim();

      if (!ticker || !nome || !tipo || !data) return;

      addProvento({
        ticker,
        nome,
        tipo: tipo.replace(/fii/i, 'FII'),
        data,
        ano,
        dividendos,
        jcp,
        rendimento,
        reembolso,
        observacao,
      });
      added++;
    });
    setMassModal(null);
    setMassStatus({ type: 'success', msg: `${added} provento(s) importado(s) com sucesso!` });
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

  const selectSimNaoStyle = {
    ...selectStyle,
    minWidth: 100,
  };

  const greenCellStyle = {
    color: '#00CC66',
    fontFamily: "'Consolas', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ marginTop: '-65px' }}>
      <h1>Proventos</h1>
      <p className="subtitle">
        Registro de dividendos, JCP, rendimentos e reembolsos
        {proventos.length > 0 && (
          <span style={{ color: '#666666', marginLeft: '8px' }}>
            — {proventos.length} registro(s)
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
          <select value={filterAno} onChange={e => setFilterAno(e.target.value)} style={selectStyle}>
            <option value="">ANO: Todos</option>
            {uniqueAnos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterDividendos} onChange={e => setFilterDividendos(e.target.value)} style={selectSimNaoStyle}>
            <option value="">DIVIDENDOS: Todos</option>
            <option value="sim">Com valor</option>
            <option value="nao">Sem valor</option>
          </select>
          <select value={filterJcp} onChange={e => setFilterJcp(e.target.value)} style={selectSimNaoStyle}>
            <option value="">JCP: Todos</option>
            <option value="sim">Com valor</option>
            <option value="nao">Sem valor</option>
          </select>
          <select value={filterRendimento} onChange={e => setFilterRendimento(e.target.value)} style={selectSimNaoStyle}>
            <option value="">RENDIMENTO: Todos</option>
            <option value="sim">Com valor</option>
            <option value="nao">Sem valor</option>
          </select>
          <select value={filterReembolso} onChange={e => setFilterReembolso(e.target.value)} style={selectSimNaoStyle}>
            <option value="">REEMBOLSO: Todos</option>
            <option value="sim">Com valor</option>
            <option value="nao">Sem valor</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setClearConfirm(true)}
            style={{
              background: '#FF3333', color: '#FFFFFF', border: 'none', borderRadius: 8,
              padding: '10px 22px', fontSize: '0.85em', fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => e.target.style.background = '#FF5555'}
            onMouseOut={e => e.target.style.background = '#FF3333'}
          >
            EXCLUIR TABELA
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: '#C8B800', color: '#0A0A0A', border: 'none', borderRadius: 8,
              padding: '10px 22px', fontSize: '0.85em', fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', letterSpacing: '1px', whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => e.target.style.background = '#E8D844'}
            onMouseOut={e => e.target.style.background = '#C8B800'}
          >
            IMPORTAR PLANILHA
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

      {massModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-edit">
            <div className="modal-header">
              <h2>Importar Proventos</h2>
              <button className="modal-close" onClick={() => setMassModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#E0E0E0', marginBottom: 16, lineHeight: 1.6 }}>
                A planilha deve conter no mínimo as colunas:{' '}
                <strong style={{ color: '#C8B800' }}>{requiredCols.join(', ')}</strong>
              </p>
              <div style={{ background: '#0D0D0D', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ color: '#E0E0E0', marginBottom: 8 }}>
                  <strong>{massModal.totalRows}</strong> linha(s) encontrada(s)
                </p>
                <p style={{ color: '#999999', fontSize: '0.9em', marginBottom: 4 }}>
                  Colunas encontradas: <span style={{ color: '#00CC66' }}>{massModal.foundCols.join(', ') || '—'}</span>
                </p>
                {massModal.missingReq.length > 0 && (
                  <p style={{ color: '#FF5555', fontSize: '0.9em', marginBottom: 4 }}>
                    Colunas obrigatórias ausentes: {massModal.missingReq.join(', ')}
                  </p>
                )}
              </div>
              {massModal.missingReq.length > 0 && (
                <p style={{ color: '#FF5555', fontSize: '0.9em', marginBottom: 16 }}>
                  As colunas obrigatórias ausentes serão ignoradas. Deseja continuar mesmo assim?
                </p>
              )}
              <p style={{ color: '#E0E0E0', fontSize: '0.95em' }}>
                {userName}, deseja importar {massModal.totalRows} provento(s)?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setMassModal(null)}>Cancelar</button>
              <button className="btn btn-save" onClick={handleConfirmMassUpload}>
                Importar {massModal.totalRows} provento(s)
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

      <div className="table-wrapper">
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
                  Nenhum provento encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const montante = calcMontante(row);
                return (
                  <tr key={row.id}>
                    <td className="td-ticker">{row.ticker}</td>
                    <td style={{ textAlign: 'center', color: '#E0E0E0' }}>{row.nome}</td>
                    <td className="td-tipo">{row.tipo}</td>
                    <td className="td-data">{formatDate(row.data)}</td>
                    <td className="td-ano">{row.ano}</td>
                    <td className="td-valor" style={row.dividendos > 0 ? greenCellStyle : {}}>
                      {formatCurrency(row.dividendos || 0)}
                    </td>
                    <td className="td-valor" style={row.jcp > 0 ? greenCellStyle : {}}>
                      {formatCurrency(row.jcp || 0)}
                    </td>
                    <td className="td-valor" style={row.rendimento > 0 ? greenCellStyle : {}}>
                      {formatCurrency(row.rendimento || 0)}
                    </td>
                    <td className="td-valor" style={row.reembolso > 0 ? greenCellStyle : {}}>
                      {formatCurrency(row.reembolso || 0)}
                    </td>
                    <td className="td-valor" style={montante > 0 ? { ...greenCellStyle, color: '#C8B800' } : {}}>
                      {formatCurrency(montante)}
                    </td>
                    <td style={{ textAlign: 'center', color: '#999999', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.observacao || '—'}
                    </td>
                    <td className="td-acoes">
                      <button style={actionBtnStyle} onClick={() => handleEdit(row)} title="Editar provento" className="btn-action edit">✏️</button>
                      <button style={actionBtnStyle} onClick={() => handleDeleteClick(row)} title="Excluir provento" className="btn-action delete">🗑️</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>Total de registros: {filtered.length}</span>
        {filtered.length > 0 && (
          <span style={{ marginLeft: '20px', color: '#666666' }}>
            Total em Proventos: {formatCurrency(filtered.reduce((acc, p) => acc + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0))}
          </span>
        )}
      </div>

      {editTarget && (
        <EditProventoModal
          data={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`${userName}, tem certeza que deseja excluir o provento de ${deleteTarget.ticker}?`}
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
              <button className="btn btn-danger" onClick={() => { clearProventos(); setClearConfirm(false); }}>
                Sim, excluir tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Proventos;
