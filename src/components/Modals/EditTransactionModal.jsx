import { formatCurrency } from '../../services/format';
import { useState } from 'react';

const tipos = ['Ação', 'FII', 'Renda Fixa'];
const operacoes = ['Compra', 'Venda'];

function EditTransactionModal({ data, transactions, onSave, onUpdateMultiple, onClose }) {
  const [form, setForm] = useState({
    ticker: data.ticker || '',
    ativo: data.ativo || '',
    cnpj: data.cnpj || '',
    tipo: data.tipo || 'Ação',
    segmento: data.segmento || '',
    operacao: data.operacao || 'Compra',
    data: data.data || '',
    ano: data.ano || new Date().getFullYear(),
    quantidade: data.quantidade || 0,
    valor: data.valor || 0,
    taxa: data.taxa || 0,
    patrimonio: data.patrimonio || 0,
  });

  const [cnpjConfirm, setCnpjConfirm] = useState(null);

  const investido = form.quantidade * form.valor + form.taxa;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (form.cnpj !== data.cnpj) {
      const sameTicker = transactions.filter(
        (t) => t.ticker === form.ticker && t.id !== data.id
      );
      if (sameTicker.length > 0 && sameTicker.some((t) => t.cnpj !== form.cnpj)) {
        setCnpjConfirm(form.cnpj);
        return;
      }
    }
    doSave();
  };

  const doSave = () => {
    onSave({ ...form, investido });
  };

  const handleUpdateAllCnpj = () => {
    const ids = transactions
      .filter((t) => t.ticker === form.ticker)
      .map((t) => t.id);
    onUpdateMultiple(ids, { cnpj: cnpjConfirm });
    setCnpjConfirm(null);
  };

  const handleCnpjKeep = () => {
    setCnpjConfirm(null);
    doSave();
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
          <h2>Editar Lançamento</h2>
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
              <label style={labelStyle}>Ativo</label>
              <input
                style={inputStyle}
                value={form.ativo}
                onChange={(e) => handleChange('ativo', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>CNPJ</label>
              <input
                style={{ ...inputStyle, borderColor: cnpjConfirm ? '#C8B800' : undefined }}
                value={form.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
              />
              {cnpjConfirm && (
                <div style={{ color: '#C8B800', fontSize: '0.8em', marginTop: '6px' }}>
                  CNPJ diferente de outros lançamentos do mesmo ativo.
                </div>
              )}
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
              <label style={labelStyle}>Segmento</label>
              <input
                style={inputStyle}
                value={form.segmento}
                onChange={(e) => handleChange('segmento', e.target.value)}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Operação</label>
              <select
                style={inputStyle}
                value={form.operacao}
                onChange={(e) => handleChange('operacao', e.target.value)}
              >
                {operacoes.map((o) => <option key={o} value={o}>{o}</option>)}
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
                onChange={(e) => handleChange('ano', Number(e.target.value))}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Quantidade</label>
              <input
                style={inputStyle}
                type="number"
                step="1"
                value={form.quantidade}
                onChange={(e) => handleChange('quantidade', Number(e.target.value))}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Valor Unitário (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => handleChange('valor', Number(e.target.value))}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Taxa (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.taxa}
                onChange={(e) => handleChange('taxa', Number(e.target.value))}
              />
            </div>

            <div style={groupStyle}>
              <label style={labelStyle}>Patrimônio Atual (R$)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={form.patrimonio}
                onChange={(e) => handleChange('patrimonio', Number(e.target.value))}
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
            <span style={{ color: '#999999' }}>Valor Investido (calculado):</span>
            <span style={{
              color: '#FFFFFF',
              fontSize: '1.2em',
              fontWeight: 'bold',
              fontFamily: 'Consolas, monospace',
            }}>
              {formatCurrency(investido)}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          {cnpjConfirm ? (
            <>
              <span style={{ color: '#E0E0E0', fontSize: '0.85em', flex: 1 }}>
                Deseja alterar o CNPJ para <strong>{cnpjConfirm}</strong> em todos os lançamentos de <strong>{form.ticker}</strong>?
              </span>
              <button className="btn btn-cancel" onClick={handleCnpjKeep} style={{ marginRight: '8px' }}>
                Não, só este
              </button>
              <button className="btn btn-save" onClick={handleUpdateAllCnpj}>
                Sim, alterar todos
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-cancel" onClick={onClose}>Cancelar</button>
              <button className="btn btn-save" onClick={handleSave}>Salvar Alterações</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditTransactionModal;
