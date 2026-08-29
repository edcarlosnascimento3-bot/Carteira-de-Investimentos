import { useMemo } from 'react';
import { calcularGanhoCapitalAnual, calcularLucroPrejuizo, verificarIsencaoVendasMensais, getOperacao, getYearFromDate } from '../../services/irrfCalculations';
import { ISENCAO_VENDA_ACOES_MENSAL } from '../../services/irrfConstants';

export default function GanhosPanel({ ano, transactions }) {
  const ganho = useMemo(() => calcularGanhoCapitalAnual(transactions, ano), [transactions, ano]);
  const isencao = useMemo(() => verificarIsencaoVendasMensais(transactions, ano), [transactions, ano]);
  const vendas = transactions.filter((t) => getOperacao(t) === 'V' && getYearFromDate(t.date || t.data) === ano);

  const porTicker = useMemo(() => {
    const map = {};
    for (const v of vendas) {
      const ticker = (v.ticker || '').toUpperCase();
      if (!map[ticker]) map[ticker] = { vendas: [], lucro: 0, totalVendas: 0 };
      map[ticker].vendas.push(v);
      const resultado = calcularLucroPrejuizo(transactions, ticker);
      map[ticker].lucro = resultado.lucro;
      map[ticker].totalVendas += v.investido || (v.valorUnitario || v.price || 0) * (v.quantidade || v.qtd || 0) + (v.taxas || 0);
    }
    return map;
  }, [vendas, transactions]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Total Vendas</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(ganho.totalVendas)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ganho.vendasCount} operações</div>
        </div>
        <div style={{ padding: '10px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary, #888)', textTransform: 'uppercase' }}>Lucro/Prejuízo</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: ganho.totalLucro >= 0 ? '#00cc66' : '#cc3333' }}>
            {fmt(ganho.totalLucro)}
          </div>
        </div>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Lucro/Prejuízo por Ticker</h4>
      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Ticker</th>
              <th style={{ ...th, textAlign: 'right' }}>Total Vendas</th>
              <th style={{ ...th, textAlign: 'right' }}>Lucro/Prejuízo</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(porTicker).map(([ticker, vals]) => (
              <tr key={ticker} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{ticker}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(vals.totalVendas)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: vals.lucro >= 0 ? '#00cc66' : '#cc3333' }}>
                  {fmt(vals.lucro)}
                </td>
              </tr>
            ))}
            {Object.keys(porTicker).length === 0 && (
              <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>Nenhuma venda em {ano}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text, #333)' }}>Isenção Mensal (até R$ 20.000/mês)</h4>
      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Mês</th>
              <th style={{ ...th, textAlign: 'right' }}>Total Vendas</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Excedente</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(isencao).map(([mes, vals]) => (
              <tr key={mes} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                <td style={{ ...td, fontWeight: 600 }}>{nomeMes(Number(mes))}</td>
                <td style={{ ...td, textAlign: 'right' }}>{fmt(vals.total)}</td>
                <td style={td}>
                  {vals.total === 0 ? (
                    <span style={{ color: 'var(--text-secondary, #888)' }}>—</span>
                  ) : vals.isento ? (
                    <span style={{ color: '#00cc66', fontWeight: 600 }}>✓ Isento</span>
                  ) : (
                    <span style={{ color: '#cc3333', fontWeight: 600 }}>✕ Tributável</span>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{vals.excedente > 0 ? fmt(vals.excedente) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary, #888)', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '8px 12px', borderBottom: '1px solid var(--border, #eee)' };
const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function nomeMes(m) { return MESES[m] || m; }
function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
