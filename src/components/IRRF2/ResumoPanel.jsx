import { useMemo } from 'react';
import InfoCard from './shared/InfoCard';
import StatusBadge from './shared/StatusBadge';
import { calcularGanhoCapitalAnual, calcularJCPDevido, calcularDARFs, verificarInconsistencias } from '../../services/irrfCalculations';

export default function ResumoPanel({ ano, transactions, proventos, rfManual, resumo, percentualChecklist }) {
  const ganhoCapital = useMemo(() => calcularGanhoCapitalAnual(transactions, ano), [transactions, ano]);
  const jcpDevido = useMemo(() => calcularJCPDevido(proventos, ano), [proventos, ano]);
  const darfs = useMemo(() => calcularDARFs(transactions, proventos, rfManual, ano), [transactions, proventos, rfManual, ano]);
  const alertas = useMemo(() => verificarInconsistencias(transactions, proventos), [transactions, proventos]);
  const totalIR = darfs.reduce((s, d) => s + (d.imposto || 0), 0) + jcpDevido.ir;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <InfoCard titulo="Compras no Ano" valor={fmt(resumo.investidoCompras)} icone="🛒" />
        <InfoCard titulo="Vendas no Ano" valor={fmt(resumo.recebidoVendas)} icone="💰" />
        <InfoCard titulo="Dividendos" valor={fmt(resumo.totalDividendos)} icone="💚" subtitulo="Isentos (Cód. 09)" />
        <InfoCard titulo="JCP Bruto" valor={fmt(resumo.totalJCP)} icone="📑" subtitulo="Cód. 10" />
        <InfoCard titulo="IR sobre JCP" valor={fmt(jcpDevido.ir)} icone="🏦" cor="#cc3333" subtitulo="17,5%" />
        <InfoCard titulo="Ganho de Capital" valor={fmt(ganhoCapital.totalLucro)} icone="📈" cor={ganhoCapital.totalLucro >= 0 ? '#00cc66' : '#cc3333'} />
        <InfoCard titulo="IR Total Estimado" valor={fmt(totalIR)} icone="⚠️" cor="#cc3333" subtitulo="JCP + Ganho Capital" />
        <InfoCard titulo="Progresso" valor={`${percentualChecklist}%`} icone="✅" cor={percentualChecklist >= 80 ? '#00cc66' : percentualChecklist >= 50 ? '#ccaa00' : '#cc3333'} />
      </div>

      {darfs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>DARFs a Emitir</h4>
          <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
                  <th style={th}>Tipo</th>
                  <th style={th}>Lucro</th>
                  <th style={th}>Alíquota</th>
                  <th style={th}>IR Devido</th>
                  <th style={th}>Código</th>
                </tr>
              </thead>
              <tbody>
                {darfs.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                    <td style={td}>{d.referencia}</td>
                    <td style={td}>{fmt(d.lucro)}</td>
                    <td style={td}>{d.aliquota}%</td>
                    <td style={{ ...td, fontWeight: 700, color: '#cc3333' }}>{fmt(d.imposto)}</td>
                    <td style={td}><code>{d.codigoReceita}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {alertas.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Alertas</h4>
          {alertas.map((a, i) => (
            <div key={i} style={{ padding: '6px 10px', borderRadius: 6, marginBottom: 4, fontSize: 13, background: a.tipo === 'error' ? '#f8d7da' : '#fff3cd', color: a.tipo === 'error' ? '#721c24' : '#856404' }}>
              <StatusBadge status={a.tipo}>{a.tipo === 'error' ? '✕' : '⚠'}</StatusBadge> {a.mensagem}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '8px 12px', borderBottom: '1px solid var(--border, #eee)' };

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
