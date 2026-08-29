import { useMemo } from 'react';
import { verificarInconsistencias, getOperacao, getYearFromDate } from '../../services/irrfCalculations';
import StatusBadge from './shared/StatusBadge';

export default function ConferenciaPanel({ ano, transactions, proventos, rfManual, resumo }) {
  const alertas = useMemo(() => verificarInconsistencias(transactions, proventos), [transactions, proventos]);
  const proventosAno = useMemo(() => proventos.filter((p) => getYearFromDate(p.date || p.data) === ano), [proventos, ano]);
  const vendasAno = useMemo(() => transactions.filter((t) => getOperacao(t) === 'V' && getYearFromDate(t.date || t.data) === ano), [transactions, ano]);
  const comprasAno = useMemo(() => transactions.filter((t) => getOperacao(t) === 'C' && getYearFromDate(t.date || t.data) === ano), [transactions, ano]);

  const conferencias = [
    {
      titulo: 'Transações cadastradas',
      ok: transactions.length > 0,
      mensagem: transactions.length > 0 ? `${transactions.length} transações encontradas` : 'Nenhuma transação cadastrada',
    },
    {
      titulo: 'Compras no ano',
      ok: comprasAno.length > 0,
      mensagem: comprasAno.length > 0 ? `${comprasAno.length} compras em ${ano}` : `Nenhuma compra em ${ano}`,
    },
    {
      titulo: 'Vendas no ano',
      ok: true,
      mensagem: vendasAno.length > 0 ? `${vendasAno.length} vendas em ${ano}` : `Nenhuma venda em ${ano}`,
    },
    {
      titulo: 'Proventos no ano',
      ok: proventosAno.length > 0,
      mensagem: proventosAno.length > 0 ? `${proventosAno.length} proventos em ${ano}` : `Nenhum provento em ${ano}`,
    },
    {
      titulo: 'Renda fixa informada',
      ok: rfManual && typeof rfManual === 'object' && Object.keys(rfManual).length > 0,
      mensagem: rfManual && typeof rfManual === 'object' ? `${Object.keys(rfManual).length} ativos RF` : 'Nenhum dado de renda fixa',
    },
    {
      titulo: 'Patrimônio consistente',
      ok: resumo.investidoCompras > 0 || resumo.recebidoVendas > 0,
      mensagem: resumo.investidoCompras > 0 ? `Investido: ${fmt(resumo.investidoCompras)}` : 'Sem dados de investimento',
    },
    {
      titulo: 'Dividendos isentos',
      ok: resumo.totalDividendos > 0,
      mensagem: resumo.totalDividendos > 0 ? `${fmt(resumo.totalDividendos)} em dividendos` : 'Nenhum dividendos isento',
    },
    {
      titulo: 'JCP informado',
      ok: true,
      mensagem: resumo.totalJCP > 0 ? `${fmt(resumo.totalJCP)} em JCP` : 'Nenhum JCP em ' + ano,
    },
  ];

  const totalConferencias = conferencias.length;
  const conferenciasOk = conferencias.filter((c) => c.ok).length;
  const percentual = Math.round((conferenciasOk / totalConferencias) * 100);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Conferências: {conferenciasOk}/{totalConferencias}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: percentual >= 80 ? '#00cc66' : percentual >= 50 ? '#ccaa00' : '#cc3333' }}>{percentual}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--border, #eee)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percentual}%`, background: percentual >= 80 ? '#00cc66' : percentual >= 50 ? '#ccaa00' : '#cc3333', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {conferencias.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < conferencias.length - 1 ? '1px solid var(--border, #eee)' : 'none' }}>
            <StatusBadge status={c.ok ? 'ok' : 'warning'}>{c.ok ? '✓' : '⚠'}</StatusBadge>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #333)' }}>{c.titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #888)' }}>{c.mensagem}</div>
            </div>
          </div>
        ))}
      </div>

      {alertas.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#cc3333' }}>Inconsistências Encontradas</h4>
          {alertas.map((a, i) => (
            <div key={i} style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 4, fontSize: 13, background: a.tipo === 'error' ? '#f8d7da' : '#fff3cd', color: a.tipo === 'error' ? '#721c24' : '#856404' }}>
              {a.tipo === 'error' ? '✕' : '⚠'} {a.mensagem}
            </div>
          ))}
        </div>
      )}

      {alertas.length === 0 && (
        <div style={{ padding: 16, background: '#d4edda', borderRadius: 8, textAlign: 'center', color: '#155724', fontSize: 13 }}>
          ✅ Nenhuma inconsistência encontrada nos dados.
        </div>
      )}
    </div>
  );
}

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
