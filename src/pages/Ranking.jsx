import { useMemo, useState, useEffect } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { formatCurrency } from '../services/format';
import { usePrices } from '../hooks/usePrices';
import LogoImage from '../components/LogoImage';

const tabs = [
  { id: 'geral', label: 'Ranking Geral' },
  { id: 'anual', label: 'Ranking Anual' },
  { id: 'retorno', label: 'Retorno x Investimento' },
  { id: 'dy', label: 'Ranking DY' },
];

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  color: '#666666',
  fontWeight: 500,
  fontSize: '0.8em',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  borderBottom: '1px solid #2A2A2A',
};

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #1A1A1A',
};

function Ranking() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [activeTab, setActiveTab] = useState('geral');
  const currentYear = new Date().getFullYear();
  const [selectedAno, setSelectedAno] = useState(currentYear);

  const anos = useMemo(() => {
    return [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
  }, [proventos]);

  useEffect(() => {
    if (anos.length > 0 && selectedAno === null) {
      setSelectedAno(anos.includes(currentYear) ? currentYear : anos[0]);
    }
  }, [anos, selectedAno]);

  const geralData = useMemo(() => {
    const map = {};
    proventos.forEach(p => {
      const t = p.ticker;
      if (!map[t]) map[t] = 0;
      map[t] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    });
    return Object.entries(map)
      .map(([ticker, total]) => ({ ticker, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }, [proventos]);

  const anualData = useMemo(() => {
    if (!selectedAno) return [];
    const map = {};
    proventos.filter(p => p.ano === selectedAno).forEach(p => {
      const t = p.ticker;
      if (!map[t]) map[t] = 0;
      map[t] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    });
    return Object.entries(map)
      .map(([ticker, total]) => ({ ticker, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }, [proventos, selectedAno]);

  const investedMap = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.ticker]) map[t.ticker] = 0;
      map[t.ticker] += t.operacao === 'Compra' ? t.investido : -t.investido;
    });
    return map;
  }, [transactions]);

  const allTickers = useMemo(() => {
    return [...new Set(proventos.map(p => p.ticker))];
  }, [proventos]);

  const { prices } = usePrices(allTickers);

  const quantityMap = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.ticker]) map[t.ticker] = 0;
      map[t.ticker] += t.operacao === 'Compra' ? t.quantidade : -t.quantidade;
    });
    return map;
  }, [transactions]);

  const proventosTotalMap = useMemo(() => {
    const map = {};
    proventos.forEach(p => {
      const t = p.ticker;
      if (!map[t]) map[t] = 0;
      map[t] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    });
    return map;
  }, [proventos]);

  const retornoData = useMemo(() => {
    const result = [];
    Object.entries(proventosTotalMap).forEach(([ticker, proventosTotal]) => {
      const invested = investedMap[ticker] || 0;
      if (invested > 0) {
        result.push({
          ticker,
          total: Math.round((proventosTotal / invested) * 10000) / 100,
        });
      }
    });
    return result.sort((a, b) => b.total - a.total);
  }, [proventosTotalMap, investedMap]);

  const dyData = useMemo(() => {
    if (!selectedAno) return [];
    const proventosAnoMap = {};
    proventos.filter(p => p.ano === selectedAno).forEach(p => {
      const t = p.ticker;
      if (!proventosAnoMap[t]) proventosAnoMap[t] = 0;
      proventosAnoMap[t] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    });
    const result = [];
    Object.entries(proventosAnoMap).forEach(([ticker, proventosTotal]) => {
      const qtd = quantityMap[ticker] || 0;
      const price = prices[ticker];
      const invested = investedMap[ticker] || 0;
      const currentValue = qtd > 0 && price != null && price > 0
        ? qtd * price
        : invested;
      if (currentValue > 0 && proventosTotal > 0) {
        result.push({
          ticker,
          total: Math.round((proventosTotal / currentValue) * 10000) / 100,
        });
      }
    });
    return result.sort((a, b) => b.total - a.total);
  }, [proventos, prices, quantityMap, investedMap, selectedAno]);

  const currentData = useMemo(() => {
    switch (activeTab) {
      case 'geral': return geralData;
      case 'anual': return anualData;
      case 'retorno': return retornoData;
      case 'dy': return dyData;
      default: return [];
    }
  }, [activeTab, geralData, anualData, retornoData, dyData]);

  const isAnualOrDy = activeTab === 'anual' || activeTab === 'dy';

  const valueHeader = activeTab === 'retorno' ? 'Retorno (%)' : activeTab === 'dy' ? 'DY (%)' : 'Valor Acumulado';

  function formatValue(item) {
    if (activeTab === 'retorno' || activeTab === 'dy') {
      return `${item.total.toFixed(2)}%`;
    }
    return formatCurrency(item.total);
  }

  function valueColor(item) {
    if (activeTab === 'retorno' || activeTab === 'dy') {
      return '#00CC66';
    }
    return '#E0E0E0';
  }

  return (
    <div>
      <h1>Ranking</h1>
      <p className="subtitle">
        Compare a performance dos seus investimentos
      </p>

      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '25px',
        borderBottom: '1px solid #2A2A2A',
        paddingBottom: '2px',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#151515' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #C8B800' : '2px solid transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#999999',
              padding: '10px 18px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontFamily: 'inherit',
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isAnualOrDy && anos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
            Selecione o ano
          </span>
          <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
          <select
            value={selectedAno || ''}
            onChange={e => setSelectedAno(Number(e.target.value))}
            style={{
              background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
              padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {anos.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{
        background: '#151515',
        border: '1px solid #2A2A2A',
        borderRadius: 12,
        overflow: 'hidden',
        maxWidth: 520,
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9em',
        }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}></th>
              <th style={thStyle}>Ticker</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>{valueHeader}</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 && (
              <tr>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 30 }}>
                  Nenhum dado disponível
                </td>
              </tr>
            )}
            {currentData.map((item, i) => (
              <tr
                key={item.ticker}
                style={{
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A00'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: i < 3 ? '#C8B80022' : 'transparent',
                    color: i < 3 ? '#FFFFFF' : '#999999',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8em',
                    fontWeight: 'bold',
                  }}>
                    {i + 1}
                  </span>
                </td>
                <td style={tdStyle}>
                  <LogoImage ticker={item.ticker} size={28} />
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: valueColor(item), fontWeight: 600 }}>
                  {formatValue(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Ranking;
