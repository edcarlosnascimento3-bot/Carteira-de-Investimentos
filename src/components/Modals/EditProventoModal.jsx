import { formatCurrency } from '../../services/format';
import { useState, useEffect, useRef, useMemo } from 'react';

function toDateInput(ddmmmyyyy) {
  if (!ddmmmyyyy) return '';
  const [d, m, y] = ddmmmyyyy.split('/');
  if (!d || !m || !y) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const INITIAL_FORM = {
  ticker: '', nome: '', tipo: '',
  data: '', dataDate: '', ano: '',
  dividendos: '', jcp: '', rendimento: '', reembolso: '', observacao: '',
};

function EditProventoModal({ data, onSave, onClose, tickerList, tickerNomeMap, tickerTipoMap, addProvento, onProventoAdded }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [filterText, setFilterText] = useState(data.ticker || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [form, setForm] = useState({
    ticker: data.ticker || '',
    nome: data.nome || '',
    tipo: data.tipo || '',
    data: data.data || '',
    dataDate: toDateInput(data.data),
    ano: data.ano || '',
    dividendos: data.dividendos != null ? data.dividendos : '',
    jcp: data.jcp != null ? data.jcp : '',
    rendimento: data.rendimento != null ? data.rendimento : '',
    reembolso: data.reembolso != null ? data.reembolso : '',
    observacao: data.observacao || '',
  });

  const filteredTickers = useMemo(() => {
    if (!tickerList) return [];
    if (!filterText) return tickerList;
    const term = filterText.toUpperCase();
    return tickerList.filter(t => t.toUpperCase().includes(term));
  }, [tickerList, filterText]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const resetForm = () => setForm({ ...INITIAL_FORM });

  useEffect(() => {
    if (form.ticker) {
      setForm((prev) => ({
        ...prev,
        nome: tickerNomeMap?.[form.ticker] || prev.nome,
        tipo: tickerTipoMap?.[form.ticker] || prev.tipo,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        nome: '', tipo: '', data: '', dataDate: '', ano: '',
        dividendos: '', jcp: '', rendimento: '', reembolso: '', observacao: '',
      }));
    }
  }, [form.ticker, tickerNomeMap, tickerTipoMap]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (value) => {
    if (!value) {
      setForm((prev) => ({ ...prev, dataDate: '', data: '', ano: '' }));
      return;
    }
    const [y, m, d] = value.split('-');
    setForm((prev) => ({
      ...prev,
      dataDate: value,
      data: `${d}/${m}/${y}`,
      ano: y,
    }));
  };

  const handleSave = () => {
    if (!form.ticker || !form.data) return;
    const { dataDate, ...rest } = form;
    const payload = {
      ...rest,
      dividendos: Number(form.dividendos),
      jcp: Number(form.jcp),
      rendimento: Number(form.rendimento),
      reembolso: Number(form.reembolso),
      ano: Number(form.ano),
    };

    if (data?.id) {
      onSave(payload);
      onClose();
    } else if (addProvento) {
      addProvento(payload);
      onProventoAdded?.();
      setShowConfirm(true);
    }
  };

  const handleConfirmSim = () => {
    console.log('handleConfirmSim chamado');
    setForm({ ...INITIAL_FORM });
    setFilterText('');
    setShowConfirm(false);
    setTimeout(() => {
      console.log('focus timeout');
      inputRef.current?.focus();
    }, 50);
  };

  const handleConfirmNao = () => {
    setShowConfirm(false);
    onClose();
    window.location.reload();
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#0A0A0A',
    border: '1px solid #2A2A2A',
    borderRadius: '6px',
    color: '#E0E0E0',
    fontSize: '0.9em',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const labelStyle = {
    display: 'block',
    color: '#999999',
    fontSize: '0.8em',
    marginBottom: '4px',
    fontWeight: 500,
  };

  const groupStyle = {
    marginBottom: '14px',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-edit" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{data?.id ? 'Editar Provento' : 'Adicionar Proventos'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ ...groupStyle, position: 'relative' }} ref={wrapperRef}>
              <label style={labelStyle}>Ticker</label>
              <input
                ref={inputRef}
                style={inputStyle}
                placeholder="Digite para filtrar..."
                value={filterText}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  const v = e.target.value.toUpperCase();
                  setFilterText(v);
                  setShowDropdown(true);
                  handleChange('ticker', v);
                }}
              />
              {showDropdown && tickerList && tickerList.length > 0 && (
                <div style={{
                  position: 'absolute', zIndex: 100, background: '#0A0A0A',
                  border: '1px solid #2A2A2A', borderRadius: '6px', maxHeight: '200px',
                  overflowY: 'auto', width: 'calc(100% - 2px)', marginTop: '2px',
                }}>
                  {filteredTickers.length === 0 ? (
                    <div style={{ padding: '10px 12px', color: '#666', fontSize: '0.85em' }}>
                      Nenhum ativo encontrado
                    </div>
                  ) : (
                    filteredTickers.map((t) => (
                      <div
                        key={t}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', color: '#E0E0E0',
                          fontSize: '0.9em', borderBottom: '1px solid #1A1A1A',
                          background: form.ticker === t ? '#1A1A00' : 'transparent',
                        }}
                        onMouseOver={e => e.target.style.background = '#222'}
                        onMouseOut={e => e.target.style.background = form.ticker === t ? '#1A1A00' : 'transparent'}
                        onClick={() => {
                          setFilterText(t);
                          handleChange('ticker', t);
                          setShowDropdown(false);
                        }}
                      >
                        {t}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Nome</label>
              <input
                style={{ ...inputStyle, color: '#E0E0E0' }}
                value={form.nome}
                readOnly
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Tipo</label>
              <input
                style={{ ...inputStyle, color: '#E0E0E0' }}
                value={form.tipo}
                readOnly
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Data</label>
              <input
                style={{ ...inputStyle, colorScheme: 'dark' }}
                type="date"
                value={form.dataDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Ano</label>
              <input
                style={{ ...inputStyle, color: '#666666', background: '#050505' }}
                value={form.ano}
                readOnly
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Dividendos (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                placeholder="0"
                value={form.dividendos}
                onChange={(e) => handleChange('dividendos', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>JCP (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                placeholder="0"
                value={form.jcp}
                onChange={(e) => handleChange('jcp', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Rendimento (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                placeholder="0"
                value={form.rendimento}
                onChange={(e) => handleChange('rendimento', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Reembolso (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                placeholder="0"
                value={form.reembolso}
                onChange={(e) => handleChange('reembolso', e.target.value)}
              />
            </div>

            <div style={{ ...groupStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Observação</label>
              <input
                style={inputStyle}
                value={form.observacao}
                onChange={(e) => handleChange('observacao', e.target.value)}
              />
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '14px',
            background: '#0D0D0D',
            borderRadius: '8px',
            border: '1px solid #2A2A2A',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#999999' }}>Montante (calculado):</span>
            <span style={{
              color: '#FFFFFF',
              fontSize: '1.2em',
              fontWeight: 'bold',
              fontFamily: 'Consolas, monospace',
            }}>
              {formatCurrency(Number(form.dividendos) + Number(form.jcp) + Number(form.rendimento) + Number(form.reembolso))}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn btn-save" onClick={handleSave}>{data?.id ? 'Salvar Alterações' : 'Adicionar'}</button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => {}}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmação</h2>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: '3em', marginBottom: '16px' }}>✅</div>
              <p style={{ color: '#E0E0E0', fontSize: '1.1em', lineHeight: 1.6 }}>
                Deseja adicionar outros proventos?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-save" onClick={handleConfirmSim}>Sim</button>
              <button className="btn btn-cancel" onClick={handleConfirmNao}>Não</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProventoModal;
