import { useMemo } from 'react';
import { calcularJCPDevido, calcularRendimentosTributados, agruparPorTicker } from '../../services/irrfCalculations';
import { CODIGOS_RENDIMENTOS } from '../../services/irrfConstants';

export default function TributacaoPanel({ ano, proventos }) {
  const jcp = useMemo(() => calcularJCPDevido(proventos, ano), [proventos, ano]);
  const rendimentos = useMemo(() => calcularRendimentosTributados(proventos, ano), [proventos, ano]);
  const totalRendimentos = rendimentos.reduce((s, p) => s + (p.rendimento || 0), 0);
  const agrupado = useMemo(() => agruparPorTicker(rendimentos), [rendimentos]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>JCP Bruto</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(jcp.totalBruto)}</div>
          <div style={{ fontSize: 11, color: '#cc3333' }}>Cód. {CODIGOS_RENDIMENTOS.JCP}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>IR sobre JCP</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#cc3333' }}>{fmt(jcp.ir)}</div>
          <div style={{ fontSize: 11, color: '#cc3333' }}>{jcp.aliquota}% retido na fonte</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Rendimentos Tributados</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(totalRendimentos)}</div>
          <div style={{ fontSize: 11, color: '#cc3333' }}>Cód. {CODIGOS_RENDIMENTOS.RENDIMENTOS_RF}</div>
        </div>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>JCP por Ticker</h4>
      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Ticker</th>
              <th style={th}>JCP Bruto</th>
              <th style={th}>IR (17,5%)</th>
              <th style={{ ...th, textAlign: 'right' }}>Líquido</th>
            </tr>
          </thead>
          <tbody>
            {jcp.totalBruto > 0 ? (
              <tr style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>Total JCP</td>
                <td style={td}>{fmt(jcp.totalBruto)}</td>
                <td style={{ ...td, color: '#cc3333' }}>{fmt(jcp.ir)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(jcp.totalBruto - jcp.ir)}</td>
              </tr>
            ) : (
              <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Nenhum JCP em {ano}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Rendimentos por Ticker</h4>
      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Ticker</th>
              <th style={{ ...th, textAlign: 'right' }}>Rendimento</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(agrupado).filter(([, v]) => v.rendimento > 0).map(([ticker, vals]) => (
              <tr key={ticker} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{ticker}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(vals.rendimento)}</td>
              </tr>
            ))}
            {Object.entries(agrupado).filter(([, v]) => v.rendimento > 0).length === 0 && (
              <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Nenhum rendimento tributado em {ano}</td></tr>
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
