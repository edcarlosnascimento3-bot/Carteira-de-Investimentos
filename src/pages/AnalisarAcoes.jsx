import { useState, useMemo, useEffect } from 'react';
import { fetchAllStocksWithSectors } from '../services/api';

const selectStyle = {
  background: 'var(--surface-dark)', color: 'var(--text)', border: '1px solid #C8B800AA',
  borderRadius: 8, padding: '8px 14px', fontSize: '0.9em', fontFamily: 'inherit',
  cursor: 'pointer', outline: 'none', textAlign: 'center', textAlignLast: 'center',
};

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

  const selectedInfo = useMemo(() => {
    return allStocks.find(s => s.stock === selected) || null;
  }, [allStocks, selected]);

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

      {selected && selectedInfo && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '14px 20px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '1.3em', fontWeight: 700, color: '#C8B800' }}>{selectedInfo.stock}</span>
            <span style={{ color: 'var(--text-soft)', fontSize: '0.95em' }}>{selectedInfo.name}</span>
            {selectedInfo.sector && (
              <span style={{
                fontSize: '0.75em', padding: '3px 10px', borderRadius: 6,
                background: 'var(--surface-hover)', color: 'var(--text-soft)',
              }}>{selectedInfo.sector}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalisarAcoes;
