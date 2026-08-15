import { useState, useMemo, useEffect } from 'react';
import { fetchAllStocksWithSectors } from '../services/api';

const selectStyle = {
  background: 'var(--surface-dark)', color: 'var(--text)', border: '1px solid #C8B800AA',
  borderRadius: 8, padding: '8px 14px', fontSize: '0.9em', fontFamily: 'inherit',
  cursor: 'pointer', outline: 'none', textAlign: 'center', textAlignLast: 'center',
};

const secaoIndicadores = [
  {
    titulo: 'Indicadores de Valuation',
    itens: [
      'D.Y', 'P/L', 'PEG RATIO', 'P/VP', 'EV/EBITIDA', 'EV/EBIT',
      'P/EBITIDA', 'P/EBIT', 'VPA', 'P/ATIVO', 'LPA', 'P/SR',
      'P/CAP GIRO', 'P/ATIVO CIRC LIQ.',
    ],
  },
  {
    titulo: 'Indicadores de Endividamento',
    itens: [
      'DIV. LIQUIDA/PL', 'DIV. LIQUIDA/EBITIDA', 'DIV. LIQUIDA/EBIT',
      'PL/ATIVOS', 'PASSIVOS/ATIVOS', 'LIQ. CORRENTE',
    ],
  },
  {
    titulo: 'Indicadores de Eficiência',
    itens: ['M. BRUTA', 'M. EBITIDA', 'M. EBIT', 'M. LIQUÍDA'],
  },
  {
    titulo: 'Indicadores de Rentabilidade',
    itens: ['ROE', 'ROA', 'ROIC', 'GIRO ATIVOS'],
  },
  {
    titulo: 'Indicadores de Crescimento',
    itens: ['CAGR RECEITA  ANOS', 'CAGR LUCROS  ANOS'],
  },
];

function AnalisarAcoes() {
  const [allStocks, setAllStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchAllStocksWithSectors().then(data => {
      setAllStocks(data || []);
      setLoading(false);
    }).catch(() => {
      setAllStocks([]);
      setLoading(false);
    });
  }, []);

  const sortedStocks = useMemo(() => {
    return [...allStocks].sort((a, b) => a.stock.localeCompare(b.stock));
  }, [allStocks]);

  return (
    <div>
      <h1>Analisar Ações</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-soft)', fontSize: '0.9em' }}>Ação:</span>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ ...selectStyle, minWidth: 260 }}
          disabled={loading}
        >
          <option value="">
            {loading ? 'Carregando ações...' : 'Selecione uma ação'}
          </option>
          {sortedStocks.map(s => (
            <option key={s.stock} value={s.stock}>
              {s.stock} - {s.name}
            </option>
          ))}
        </select>
      </div>

      {secaoIndicadores.map((secao, si) => (
        <div key={si} style={{ marginBottom: si === secaoIndicadores.length - 1 ? 0 : 30 }}>
          <div style={{
            color: '#C8B800', fontWeight: 700, fontSize: '0.9em', letterSpacing: '1px',
            marginBottom: 10,
          }}>
            {secao.titulo}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {secao.itens.map((item, ii) => (
              <div key={ii} style={{ color: 'var(--text)', fontSize: '0.88em' }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AnalisarAcoes;
