import { useState, useMemo } from 'react';
import { useProventos } from '../context/ProventosContext';

const meses = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

const redShades = [
  { max: 50.00, bg: '#FFE0E0' },
  { max: 100.00, bg: '#FFC0C0' },
  { max: 150.00, bg: '#FFA0A0' },
  { max: 200.00, bg: '#FF8080' },
  { max: 250.00, bg: '#FF6060' },
  { max: 300.00, bg: '#FF4040' },
  { max: 350.00, bg: '#FF2020' },
  { max: 400.00, bg: '#FF0000' },
  { max: Infinity, bg: '#CC0000' },
];

function getRedShade(valor) {
  if (valor <= 0) return '#FFFFFF';
  const found = redShades.find(s => valor <= s.max);
  return found ? found.bg : '#CC0000';
}

function MIDI() {
  const { proventos } = useProventos();
  const [anoFiltro, setAnoFiltro] = useState('');

  const uniqueAnos = useMemo(() => {
    return [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
  }, [proventos]);

  const tickerData = useMemo(() => {
    const filtered = anoFiltro
      ? proventos.filter(p => p.ano === Number(anoFiltro))
      : proventos;
    const map = {};
    filtered.forEach((p) => {
      const montante = (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
      if (!map[p.ticker]) {
        map[p.ticker] = { ticker: p.ticker, meses: Array(12).fill(0), total: 0 };
      }
      const parts = p.data ? p.data.split('/') : [];
      const mes = parts.length === 3 ? parseInt(parts[1], 10) - 1 : -1;
      if (mes >= 0 && mes < 12) {
        map[p.ticker].meses[mes] += montante;
      }
      map[p.ticker].total += montante;
    });
    return Object.values(map).sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [proventos, anoFiltro]);

  const formatCurrency = (v) =>
    `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <div style={{ marginTop: '-65px' }}>
      <h1>MIDI</h1>
      <p className="subtitle">
        Proventos por ativo — distribuição mensal
        {tickerData.length > 0 && (
          <span style={{ color: '#666666', marginLeft: '8px' }}>
            — {tickerData.length} ativo(s)
          </span>
        )}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}>
        <span style={{ color: '#E0E0E0', fontSize: '0.9em' }}>
          Selecione o ano desejado
        </span>
        <span style={{ color: '#FF3333', fontSize: '1.2em', lineHeight: 1 }}>➡</span>
        <select
          value={anoFiltro}
          onChange={e => setAnoFiltro(e.target.value)}
          style={{
            background: '#0D0D0D',
            color: '#E0E0E0',
            border: '1px solid #C8B800AA',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: '0.85em',
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none',
            minWidth: 100,
            textAlign: 'center',
            textAlignLast: 'center',
          }}
        >
          <option value="">Todos os anos</option>
          {uniqueAnos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {tickerData.length === 0 ? (
        <div className="page-placeholder" style={{ height: '60%' }}>
          <div className="icon">🔗</div>
          <h2>MIDI</h2>
          <p>Nenhum provento encontrado. Adicione registros na página Proventos.</p>
        </div>
      ) : (
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{
                  background: '#93c47d',
                  color: '#000000',
                  minWidth: 55,
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1.0em',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '1px solid #2A2A2A',
                }}>
                  TICKER
                </th>
                {meses.map((mes) => (
                  <th key={mes} style={{
                    background: '#C8B800',
                    color: '#000000',
                    minWidth: 50,
                    padding: '6px 2px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '1.0em',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2px',
                    borderBottom: '1px solid #2A2A2A',
                  }}>
                    {mes}
                  </th>
                ))}
                <th style={{
                  background: '#00ffff',
                  color: '#000000',
                  minWidth: 20,
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1.0em',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '1px solid #2A2A2A',
                }}>
                  TOTAL
                </th>
              </tr>
              <tr style={{ background: '#000000' }}>
                <td style={{ padding: '4px 4px', background: '#000000', textAlign: 'center' }} />
                {tickerData.length > 0 ? meses.map((_, idx) => {
                  const count = tickerData.filter(r => r.meses[idx] > 0).length;
                  return (
                    <td key={idx} style={{ padding: '4px 2px', background: '#000000', textAlign: 'center', color: '#FFFFFF', fontSize: '0.8em', fontWeight: 600 }}>
                      {count || '—'}
                    </td>
                  );
                }) : meses.map((_, idx) => (
                  <td key={idx} style={{ padding: '4px 2px', background: '#000000', textAlign: 'center', color: '#FFFFFF', fontSize: '0.8em', fontWeight: 600 }}>—</td>
                ))}
                <td style={{ padding: '4px 4px', background: '#000000', textAlign: 'center' }} />
              </tr>
            </thead>
            <tbody>
              {tickerData.map((row) => (
                <tr key={row.ticker}>
                  <td style={{
                    background: '#93c47d',
                    color: '#000000',
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '6px 4px',
                    borderBottom: '1px solid #1A1A1A',
                    fontSize: '1.0em',
                  }}>
                    {row.ticker}
                  </td>
                  {row.meses.map((valor, idx) => {
                    const bg = getRedShade(valor);
                    const fontColor = bg === '#FFFFFF' ? '#999999' : valor > 300 ? '#FFFFFF' : '#000000';
                    return (
                      <td key={idx} style={{
                        textAlign: 'center',
                        padding: '6px 2px',
                        borderBottom: '1px solid #1A1A1A',
                        background: bg,
                        color: fontColor,
                        fontFamily: "'Consolas', monospace",
                        fontWeight: 700,
                        fontSize: '1.0em',
                      }}>
                        {valor > 0 ? formatCurrency(valor) : '—'}
                      </td>
                    );
                  })}
                  <td style={{
                    background: '#00ffff',
                    color: '#000000',
                    textAlign: 'center',
                    padding: '6px 4px',
                    borderBottom: '1px solid #1A1A1A',
                    fontFamily: "'Consolas', monospace",
                    fontWeight: 700,
                    fontSize: '1.0em',
                  }}>
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        {tickerData.length > 0 && (
          <span>
            Total geral: {formatCurrency(tickerData.reduce((acc, r) => acc + r.total, 0))}
          </span>
        )}
      </div>
    </div>
  );
}

export default MIDI;
