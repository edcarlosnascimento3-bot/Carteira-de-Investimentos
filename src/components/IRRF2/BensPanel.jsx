import { useMemo } from 'react';
import { mapearParaDirpf } from '../../services/irrfCalculations';
import { getTickerInfo } from '../../services/tickerRegistry';
import CopyIcon from './shared/CopyIcon';
import StatusBadge from './shared/StatusBadge';

export default function BensPanel({ ano, transactions, resumo }) {
  const ativos = useMemo(() => {
    const tickers = [...new Set(transactions.map((t) => (t.ticker || '').toUpperCase()))];
    return tickers.map((ticker) => {
      const info = getTickerInfo(ticker);
      return { ticker, ...(info || {}) };
    });
  }, [transactions]);

  const bens = useMemo(() => mapearParaDirpf(transactions, ativos), [transactions, ativos]);
  const totalInvestido = bens.reduce((s, b) => s + (b.investido || 0), 0);
  const bensComSaldo = bens.filter((b) => b.quantidade > 0 || b.investido !== 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, fontSize: 13 }}>
          <strong>{bensComSaldo.length}</strong> ativos para declarar
        </div>
        <div style={{ padding: '8px 14px', background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, fontSize: 13 }}>
          Total investido: <strong>{fmt(totalInvestido)}</strong>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-header, #f5f5f5)' }}>
              <th style={th}>Ticker</th>
              <th style={th}>Grupo</th>
              <th style={th}>Código</th>
              <th style={th}>Discriminação</th>
              <th style={{ ...th, textAlign: 'right' }}>Custo Aquisição</th>
              <th style={th}>Local</th>
              <th style={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {bensComSaldo.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-secondary, #888)', padding: 20 }}>
                  Nenhum ativo encontrado. Registre transações na página Lançamentos.
                </td>
              </tr>
            ) : (
              bensComSaldo.map((b) => (
                <tr key={b.ticker} style={{ borderBottom: '1px solid var(--border, #eee)' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{b.ticker}</td>
                  <td style={td}><StatusBadge status="info">{b.grupo}</StatusBadge></td>
                  <td style={td}><code>{b.codigo}</code></td>
                  <td style={{ ...td, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.discriminacao}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(b.investido)}</td>
                  <td style={td}>105</td>
                  <td style={td}><CopyIcon text={b.discriminacao} label="Copiar discriminação" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, padding: 12, background: '#d1ecf1', borderRadius: 8, fontSize: 12, color: '#0c5460' }}>
        💡 <strong>Dica:</strong> Na DIRPF, cada ativo deve ser informado no grupo correspondente. Use o código do grupo e a discriminação gerada.
        Valor total: <strong>{fmt(totalInvestido)}</strong>.
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
