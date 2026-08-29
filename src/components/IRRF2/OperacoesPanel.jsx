import { useMemo } from 'react';
import { calcularOperacoesBolsa } from '../../services/irrfCalculations';

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function OperacoesPanel({ ano, transactions }) {
  const porMes = useMemo(() => calcularOperacoesBolsa(transactions, ano), [transactions, ano]);
  const totalCompras = Object.values(porMes).reduce((s, m) => s + m.compras, 0);
  const totalVendas = Object.values(porMes).reduce((s, m) => s + m.vendas, 0);
  const totalInvestido = Object.values(porMes).reduce((s, m) => s + m.investidoCompra, 0);
  const totalRecebido = Object.values(porMes).reduce((s, m) => s + m.investidoVenda, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Total Compras</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalCompras}</div>
          <div style={{ fontSize: 11 }}>{fmt(totalInvestido)}</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Total Vendas</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{totalVendas}</div>
          <div style={{ fontSize: 11 }}>{fmt(totalRecebido)}</div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Mês</th>
              <th style={{ ...th, textAlign: 'right' }}>Compras</th>
              <th style={{ ...th, textAlign: 'right' }}>Vendas</th>
              <th style={{ ...th, textAlign: 'right' }}>Investido</th>
              <th style={{ ...th, textAlign: 'right' }}>Recebido</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const d = porMes[m];
              const temOperacao = d.compras > 0 || d.vendas > 0;
              return (
                <tr key={m} style={{ borderBottom: '1px solid var(--border, #eee)', opacity: temOperacao ? 1 : 0.5 }}>
                  <td style={{ ...td, fontWeight: 600 }}>{MESES[m]}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.compras > 0 ? d.compras : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.vendas > 0 ? d.vendas : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.investidoCompra > 0 ? fmt(d.investidoCompra) : '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{d.investidoVenda > 0 ? fmt(d.investidoVenda) : '—'}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 700, background: 'var(--card-header, #f5f5f5)' }}>
              <td style={td}>Total</td>
              <td style={{ ...td, textAlign: 'right' }}>{totalCompras}</td>
              <td style={{ ...td, textAlign: 'right' }}>{totalVendas}</td>
              <td style={{ ...td, textAlign: 'right' }}>{fmt(totalInvestido)}</td>
              <td style={{ ...td, textAlign: 'right' }}>{fmt(totalRecebido)}</td>
            </tr>
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
