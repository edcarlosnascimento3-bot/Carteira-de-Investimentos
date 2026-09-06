import { formatCurrency } from '../services/format';
import { useState, useCallback } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useUser } from '../context/UserContext';
import { useRfManual } from '../context/RfManualContext';
import ConfirmModal from '../components/Modals/ConfirmModal';
import Toast from '../components/Toast';
import { getTickerInfo, saveTickerInfo } from '../services/tickerRegistry';

const segmentos = ['Agronegócio', 'Consumo', 'Energia', 'Financeiro', 'Imobiliário', 'Infraestrutura', 'Mineração', 'Saneamento', 'Tecnologia', 'Transporte'];

function Venda() {
  const { transactions, addTransaction } = useTransactions();
  const { userName } = useUser();
  const { updateRfManual } = useRfManual();

  const [form, setForm] = useState({
    ticker: '',
    nome: '',
    cnpj: '',
    tipo: '',
    segmento: '',
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
    setForm({ ticker: '', nome: '', cnpj: '', tipo: '', segmento: '', data: '', quantidade: '', valor: '', taxas: '' });
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
    if (!form.segmento) missing.push('Segmento');
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
      segmento: form.segmento,
      operacao: 'Venda',
      data: dataBR,
      ano,
      quantidade: qtd,
      valor: vlr,
      taxa: tx,
      investido: total,
      patrimonio: total,
    });

    if (form.tipo === 'Renda Fixa') {
      updateRfManual((prev) => {
        if (prev[ticker] != null) {
          prev[ticker] += total;
        } else {
          const txTotal = transactions
            .filter(t => t.ticker === ticker && t.operacao === 'Venda')
            .reduce((s, t) => s + (Number(t.investido) || 0), 0);
          prev[ticker] = txTotal + total;
        }
        return { ...prev };
      });
    }

    setSaved(true);
    setErrors([]);
    setForm({ ticker: '', nome: '', cnpj: '', tipo: '', segmento: '', data: '', quantidade: '', valor: '', taxas: '' });
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--surface-dark, #f8f8f8)',
    color: 'var(--text, #333)',
    border: '1px solid var(--border, #ddd)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-secondary, #888)',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3',
  };

  const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  };

  return (
    <div className="compra-page">
      <h2 style={{ fontSize: '1.2em', fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Venda</h2>

      <form className="compra-form venda-form" style={{ maxWidth: 660, width: '100%' }} onSubmit={handleSubmit}>
        <div style={formGridStyle}>
          <div>
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
          <div>
            <label style={labelStyle}>Nome</label>
            <input
              style={inputStyle}
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Nome do ativo"
            />
          </div>
          <div>
            <label style={labelStyle}>CNPJ</label>
            <input
              style={inputStyle}
              value={form.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              style={{ ...inputStyle, color: form.tipo ? 'var(--text)' : 'var(--text-faint)' }}
              value={form.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
            >
              <option value="" disabled hidden>Selecione o tipo</option>
              <option value="Ação">Ação</option>
              <option value="FII">FII</option>
              <option value="Renda Fixa">Renda Fixa</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Segmento</label>
            <select
              style={{ ...inputStyle, color: form.segmento ? 'var(--text)' : 'var(--text-faint)' }}
              value={form.segmento}
              onChange={(e) => handleChange('segmento', e.target.value)}
            >
              <option value="" disabled hidden>Selecione o segmento</option>
              {segmentos.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Data</label>
            <input
              style={{ ...inputStyle, colorScheme: 'dark' }}
              type="date"
              value={form.data}
              onChange={(e) => handleChange('data', e.target.value)}
            />
          </div>
          <div>
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
          <div>
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
          <div>
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
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Total</label>
          <div className="compra-total">{formatCurrency(total)}</div>
        </div>

        {errors.length > 0 && (
          <div className="compra-error">
            {errors.map((msg, i) => <div key={i}>{msg}</div>)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
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

export default Venda;