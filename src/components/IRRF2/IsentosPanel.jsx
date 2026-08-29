import { useMemo } from 'react';
import { calcularRendimentosIsentos, calcularRendimentosFIIIsentos, agruparPorTicker, agruparPorInstituicao } from '../../services/irrfCalculations';
import { CODIGOS_RENDIMENTOS } from '../../services/irrfConstants';
import CopyIcon from './shared/CopyIcon';

export default function IsentosPanel({ ano, proventos }) {
  const dividendos = useMemo(() => calcularRendimentosIsentos(proventos, ano), [proventos, ano]);
  const fiis = useMemo(() => calcularRendimentosFIIIsentos(proventos, ano), [proventos, ano]);
  const totalDividendos = dividendos.reduce((s, p) => s + (p.dividendos || 0), 0);
  const totalFII = fiis.reduce((s, p) => s + (p.dividendos || 0) + (p.reembolso || 0), 0);
  const agrupadoTicker = useMemo(() => agruparPorTicker([...dividendos, ...fiis]), [dividendos, fiis]);
  const agrupadoInst = useMemo(() => agruparPorInstituicao([...dividendos, ...fiis]), [dividendos, fiis]);
  const totalGeral = totalDividendos + totalFII;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Total Isentos</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#00cc66' }}>{fmt(totalGeral)}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Dividendos (Ações)</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalDividendos)}</div>
          <div style={{ fontSize: 11, color: '#00cc66' }}>Cód. {CODIGOS_RENDIMENTOS.DIVIDENDOS}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Rendimentos FII</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalFII)}</div>
          <div style={{ fontSize: 11, color: '#00cc66' }}>Cód. {CODIGOS_RENDIMENTOS.OUTROS}</div>
        </div>
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
              <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Nenhum rendimento isento encontrado para {ano}</td></tr>
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
              <th style={th}>Dividendos</th>
              <th style={th}>FII</th>
              <th style={{ ...th, textAlign: 'right' }}>Total</th>
              <th style={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(agrupadoInst).map(([inst, vals]) => (
              <tr key={inst} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{inst}</td>
                <td style={td}>{fmt(vals.dividendos)}</td>
                <td style={td}>{fmt(vals.rendimento + vals.reembolso)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(vals.total)}</td>
                <td style={td}><CopyIcon text={`${inst}: ${fmt(vals.total)}`} label="Copiar" /></td>
              </tr>
            ))}
            {Object.keys(agrupadoInst).length === 0 && (
              <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Sem dados de instituição</td></tr>
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
