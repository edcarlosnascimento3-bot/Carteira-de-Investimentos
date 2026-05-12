import { useState } from 'react';

const tipos = ['Ação', 'FII', 'Renda Fixa'];

function EditProventoModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({
    ticker: data.ticker || '',
    nome: data.nome || '',
    tipo: data.tipo || 'Ação',
    data: data.data || '',
    ano: data.ano || new Date().getFullYear(),
    dividendos: data.dividendos || 0,
    jcp: data.jcp || 0,
    rendimento: data.rendimento || 0,
    reembolso: data.reembolso || 0,
    observacao: data.observacao || '',
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      dividendos: Number(form.dividendos),
      jcp: Number(form.jcp),
      rendimento: Number(form.rendimento),
      reembolso: Number(form.reembolso),
      ano: Number(form.ano),
    });
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
          <h2>Editar Provento</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Ticker</label>
              <input
                style={inputStyle}
                value={form.ticker}
                onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Nome</label>
              <input
                style={inputStyle}
                value={form.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Tipo</label>
              <select
                style={inputStyle}
                value={form.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
              >
                {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Data</label>
              <input
                style={inputStyle}
                value={form.data}
                onChange={(e) => handleChange('data', e.target.value)}
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Ano</label>
              <input
                style={inputStyle}
                type="number"
                value={form.ano}
                onChange={(e) => handleChange('ano', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Dividendos (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
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
              R$ {(Number(form.dividendos) + Number(form.jcp) + Number(form.rendimento) + Number(form.reembolso)).toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn btn-save" onClick={handleSave}>Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
}

export default EditProventoModal;
