import { useState, useCallback } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useUser } from '../context/UserContext';
import ConfirmModal from '../components/Modals/ConfirmModal';
import Toast from '../components/Toast';
import { getTickerInfo, saveTickerInfo } from '../services/tickerRegistry';

function Compra() {
  const { transactions, addTransaction } = useTransactions();
  const { userName } = useUser();

  const [form, setForm] = useState({
    ticker: '',
    nome: '',
    cnpj: '',
    tipo: '',
    data: '',
    quantidade: '',
    valor: '',
    taxas: '',
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState([]);

  const qtd = Number(form.quantidade) || 0;
  const vlr = Number(form.valor) || 0;
  const tx = Number(form.taxas) || 0;
  const total = qtd * vlr + tx;

  const tickers = [...new Set(transactions.map((t) => t.ticker))].sort();

  const handleChange = useCallback((field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'ticker' && value) {
        const info = getTickerInfo(value);
        if (info) {
          next.nome = info.nome;
          next.cnpj = info.cnpj;
          next.tipo = info.tipo;
        }
      }
      return next;
    });
    if (errors.length) setErrors([]);
  }, [errors]);

  const handleClear = () => {
    setShowConfirm(true);
  };

  const confirmClear = () => {
    setForm({ ticker: '', nome: '', cnpj: '', tipo: '', data: '', quantidade: '', valor: '', taxas: '' });
    setSaved(false);
    setErrors([]);
    setShowConfirm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors([]);

    const missing = [];

    if (!form.ticker.trim()) missing.push('Ticker');
    if (!form.nome.trim()) missing.push('Nome');
    if (!form.cnpj.trim()) missing.push('CNPJ');
    if (!form.tipo) missing.push('Tipo');
    if (!form.data) missing.push('Data');
    if (!form.quantidade || Number(form.quantidade) <= 0) missing.push('Quantidade');
    if (!form.valor || Number(form.valor) <= 0) missing.push('Valor Unitário');

    if (missing.length > 0) {
      const msg = missing.length === 1
        ? `O campo ${missing[0]} deve ser preenchido.`
        : `Os campos ${missing.slice(0, -1).join(', ')} e ${missing.slice(-1)} devem ser preenchidos.`;
      setErrors([msg]);
      return;
    }

    const dataObj = new Date(form.data + 'T12:00:00');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const dataBR = `${dia}/${mes}/${ano}`;

    const ticker = form.ticker.toUpperCase();
    saveTickerInfo(ticker, { nome: form.nome, cnpj: form.cnpj, tipo: form.tipo });

    addTransaction({
      imagem: null,
      ticker,
      ativo: form.nome,
      cnpj: form.cnpj,
      tipo: form.tipo,
      segmento: '',
      operacao: 'Compra',
      data: dataBR,
      ano,
      quantidade: qtd,
      valor: vlr,
      taxa: tx,
      investido: total,
      patrimonio: total,
    });

    setSaved(true);
    setErrors([]);
    setForm({ ticker: '', nome: '', cnpj: '', tipo: '', data: '', quantidade: '', valor: '', taxas: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    flex: 1,
    padding: '10px 14px',
    background: '#0A0A0A',
    border: '1px solid #2A2A2A',
    borderRadius: '8px',
    color: '#E0E0E0',
    fontSize: '0.95em',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '14px',
  };

  const labelStyle = {
    width: '140px',
    color: '#CCCCCC',
    fontSize: '0.9em',
    fontWeight: 500,
    flexShrink: 0,
  };

  return (
    <div className="compra-page">
      <div className="compra-header">
        <span>Compra</span>
      </div>

      <form className="compra-form" onSubmit={handleSubmit}>
        <div style={rowStyle}>
          <label style={labelStyle}>Ticker</label>
          <input
            style={inputStyle}
            list="ticker-list"
            value={form.ticker}
            onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
            placeholder="Ex: PETR4"
          />
          <datalist id="ticker-list">
            {tickers.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Nome</label>
          <input
            style={inputStyle}
            value={form.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Nome do ativo"
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>CNPJ</label>
          <input
            style={inputStyle}
            value={form.cnpj}
            onChange={(e) => handleChange('cnpj', e.target.value)}
            placeholder="00.000.000/0001-00"
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Tipo</label>
          <select
            style={{ ...inputStyle, color: form.tipo ? '#E0E0E0' : '#666666' }}
            value={form.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
          >
            <option value="" disabled hidden>Selecione o tipo</option>
            <option value="Ação">Ação</option>
            <option value="FII">FII</option>
            <option value="Renda Fixa">Renda Fixa</option>
          </select>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Data</label>
          <input
            style={{
              ...inputStyle,
              colorScheme: 'dark',
            }}
            type="date"
            value={form.data}
            onChange={(e) => handleChange('data', e.target.value)}
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Quantidade</label>
          <input
            style={inputStyle}
            type="number"
            step="1"
            min="0"
            value={form.quantidade}
            onChange={(e) => handleChange('quantidade', e.target.value)}
            placeholder="0"
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Valor Unitário</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0"
            value={form.valor}
            onChange={(e) => handleChange('valor', e.target.value)}
            placeholder="0,00"
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Taxas</label>
          <input
            style={inputStyle}
            type="number"
            step="0.01"
            min="0"
            value={form.taxas}
            onChange={(e) => handleChange('taxas', e.target.value)}
            placeholder="0,00"
          />
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>Total</label>
          <div className="compra-total">
            R$ {total.toFixed(2).replace('.', ',')}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="compra-error">
            {errors.map((msg, i) => <div key={i}>{msg}</div>)}
          </div>
        )}

        <div className="compra-actions">
          <button type="button" className="compra-btn compra-btn-clear" onClick={handleClear}>
            Apagar
          </button>
          <button type="submit" className="compra-btn compra-btn-save">
            Salvar
          </button>
        </div>

        <Toast
          message="Lançamento salvo com sucesso!"
          visible={saved}
          onClose={() => setSaved(false)}
          color="#00CC66"
        />
      </form>

      {showConfirm && (
        <ConfirmModal
          message={`${userName}, tem certeza que deseja limpar todo o formulário? Os dados não salvos serão perdidos.`}
          onConfirm={confirmClear}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

export default Compra;
