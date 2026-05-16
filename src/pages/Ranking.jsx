import { formatCurrency } from '../services/format';
import { useState } from 'react';

const tabs = [
  { id: 'geral', label: 'Ranking Geral' },
  { id: 'anual', label: 'Ranking Anual' },
  { id: 'retorno', label: 'Retorno x Investimento' },
  { id: 'dy', label: 'Ranking DY' },
];

const mockRankings = {
  geral: [
    { ativo: 'PETR4', retorno: 32.5, dy: 8.2 },
    { ativo: 'VALE3', retorno: 28.1, dy: 6.5 },
    { ativo: 'ITUB4', retorno: 22.8, dy: 7.1 },
    { ativo: 'BBAS3', retorno: 18.4, dy: 5.9 },
    { ativo: 'HGLG11', retorno: 15.2, dy: 9.3 },
  ],
  anual: [
    { ativo: 'PETR4', retorno: 32.5, dy: 8.2 },
    { ativo: 'EMBR3', retorno: 27.3, dy: 2.1 },
    { ativo: 'VALE3', retorno: 22.1, dy: 6.5 },
    { ativo: 'ITUB4', retorno: 18.9, dy: 7.1 },
    { ativo: 'WEGE3', retorno: 16.4, dy: 3.8 },
  ],
  retorno: [
    { ativo: 'PETR4', retorno: 32.5, dy: 8.2, investido: 5000, atual: 6625 },
    { ativo: 'VALE3', retorno: 28.1, dy: 6.5, investido: 8000, atual: 10248 },
    { ativo: 'ITUB4', retorno: 22.8, dy: 7.1, investido: 3000, atual: 3684 },
    { ativo: 'BBAS3', retorno: 18.4, dy: 5.9, investido: 6000, atual: 7104 },
    { ativo: 'HGLG11', retorno: 15.2, dy: 9.3, investido: 10000, atual: 11520 },
  ],
  dy: [
    { ativo: 'HGLG11', dy: 9.3, setor: 'FII' },
    { ativo: 'PETR4', dy: 8.2, setor: 'Óleo e Gás' },
    { ativo: 'ITUB4', dy: 7.1, setor: 'Financeiro' },
    { ativo: 'VALE3', dy: 6.5, setor: 'Mineração' },
    { ativo: 'TAEE11', dy: 6.1, setor: 'Energia' },
  ],
};

function Ranking() {
  const [activeTab, setActiveTab] = useState('geral');
  const data = mockRankings[activeTab] || [];



  return (
    <div>
      <h1>Ranking</h1>
      <p className="subtitle">
        Compare a performance dos seus investimentos
      </p>

      {/* Abas do Ranking */}
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

      {/* Tabela do Ranking */}
      <div style={{
        background: '#151515',
        border: '1px solid #2A2A2A',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9em',
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Ativo</th>
              {activeTab === 'retorno' && <th style={thStyle}>Valor Investido</th>}
              {activeTab === 'retorno' && <th style={thStyle}>Valor Atual</th>}
              {activeTab === 'dy' && <th style={thStyle}>Setor</th>}
              <th style={{ ...thStyle, textAlign: 'right' }}>Retorno (%)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>DY (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr
                key={item.ativo}
                style={{
                  borderBottom: i < data.length - 1 ? '1px solid #1A1A1A' : 'none',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A00'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: i < 3 ? '#C8B80022' : 'transparent',
                    color: i < 3 ? '#FFFFFF' : '#999999',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                  }}>
                    {i + 1}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600, color: '#FFFFFF' }}>{item.ativo}</td>
                {activeTab === 'retorno' && 'investido' in item && (
                  <td style={tdStyle}>{formatCurrency(item.investido)}</td>
                )}
                {activeTab === 'retorno' && 'atual' in item && (
                  <td style={{ ...tdStyle, color: '#FFFFFF' }}>{formatCurrency(item.atual)}</td>
                )}
                {activeTab === 'dy' && 'setor' in item && (
                  <td style={{ ...tdStyle, color: '#999999' }}>{item.setor}</td>
                )}
                <td style={{ ...tdStyle, textAlign: 'right', color: '#00CC66' }}>
                  +{item.retorno}%
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: '#E0E0E0' }}>
                  {item.dy}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  color: '#666666',
  fontWeight: 500,
  fontSize: '0.85em',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const tdStyle = {
  padding: '12px 16px',
};

export default Ranking;
