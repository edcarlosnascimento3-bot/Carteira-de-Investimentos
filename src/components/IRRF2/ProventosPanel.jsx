import { useMemo } from 'react';
import { agruparPorTicker, agruparPorInstituicao } from '../../services/irrfCalculations';

export default function ProventosPanel({ ano, proventos }) {
  const proventosAno = useMemo(
    () => proventos.filter((p) => (p.date || p.data) && new Date(p.date || p.data).getFullYear() === ano),
    [proventos, ano]
  );
  const agrupadoTicker = useMemo(() => agruparPorTicker(proventosAno), [proventosAno]);
  const agrupadoInst = useMemo(() => agruparPorInstituicao(proventosAno), [proventosAno]);
  const total = proventosAno.reduce((s, p) => s + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0);

  const porMes = useMemo(() => {
    const map = {};
    for (let m = 1; m <= 12; m++) map[m] = 0;
    for (const p of proventosAno) {
      const m = new Date(p.date || p.data).getMonth() + 1;
      map[m] += (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
    }
    return map;
  }, [proventosAno]);

  const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Total Proventos {ano}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#00cc66' }}>{fmt(total)}</div>
          <div style={{ fontSize: 11 }}>{proventosAno.length} registros</div>
        </div>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Evolução Mensal</h4>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, alignItems: 'flex-end', height: 100, background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, padding: 12 }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const maxVal = Math.max(...Object.values(porMes), 1);
          const h = (porMes[m] / maxVal) * 70;
          return (
            <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ fontSize: 9, color: 'var(--text-secondary, #888)' }}>{porMes[m] > 0 ? fmt(porMes[m]) : ''}</div>
              <div style={{ width: '100%', height: Math.max(h, 2), background: '#00cc66', borderRadius: 3, minHeight: 2 }} />
              <div style={{ fontSize: 9, color: 'var(--text-secondary, #888)' }}>{MESES[m]}</div>
            </div>
          );
        })}
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Por Ticker</h4>
      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Ticker</th>
              <th style={th}>Dividendos</th>
              <th style={th}>JCP</th>
              <th style={th}>Rendimento</th>
              <th style={th}>Reembolso</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(agrupadoTicker).map(([ticker, vals]) => (
              <tr key={ticker} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{ticker}</td>
                <td style={td}>{fmt(vals.dividendos)}</td>
                <td style={td}>{fmt(vals.jcp)}</td>
                <td style={td}>{fmt(vals.rendimento)}</td>
                <td style={td}>{fmt(vals.reembolso)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(vals.total)}</td>
              </tr>
            ))}
            {Object.keys(agrupadoTicker).length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Nenhum provento em {ano}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Por Instituição</h4>
      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Instituição</th>
              <th style={{ ...th, textAlign: 'right' }}>Dividendos</th>
              <th style={{ ...th, textAlign: 'right' }}>JCP</th>
              <th style={{ ...th, textAlign: 'right' }}>Rendimento</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(agrupadoInst).map(([inst, vals]) => (
              <tr key={inst} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{inst}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(vals.dividendos)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(vals.jcp)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(vals.rendimento)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(vals.total)}</td>
              </tr>
            ))}
            {Object.keys(agrupadoInst).length === 0 && (
              <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '8px 12px', borderBottom: '1px solid var(--border, #eee)' };

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
