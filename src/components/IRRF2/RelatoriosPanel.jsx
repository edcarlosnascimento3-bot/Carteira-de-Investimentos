import { useMemo, useState } from 'react';
import { calcularResumoAnual, calcularGanhoCapitalAnual, calcularJCPDevido, calcularDARFs, mapearParaDirpf, verificarInconsistencias } from '../../services/irrfCalculations';

export default function RelatoriosPanel({ ano, transactions, proventos, rfManual, resumo }) {
  const [gerando, setGerando] = useState(false);
  const ganhoCapital = useMemo(() => calcularGanhoCapitalAnual(transactions, ano), [transactions, ano]);
  const jcpDevido = useMemo(() => calcularJCPDevido(proventos, ano), [proventos, ano]);
  const darfs = useMemo(() => calcularDARFs(transactions, proventos, rfManual, ano), [transactions, proventos, rfManual, ano]);
  const alertas = useMemo(() => verificarInconsistencias(transactions, proventos), [transactions, proventos]);
  const bens = useMemo(() => mapearParaDirpf(transactions, []), [transactions]);

  const gerarRelatorio = () => {
    setGerando(true);
    setTimeout(() => {
      const linhas = [];
      linhas.push('='.repeat(60));
      linhas.push(`  RELATÓRIO DE CONFERÊNCIA — IRPF ${ano + 1}`);
      linhas.push(`  Ano-Calendário: ${ano}`);
      linhas.push(`  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);
      linhas.push('='.repeat(60));
      linhas.push('');

      linhas.push('--- RESUMO FINANCEIRO ---');
      linhas.push(`Compras no ano:     ${fmt(resumo.investidoCompras)}`);
      linhas.push(`Vendas no ano:      ${fmt(resumo.recebidoVendas)}`);
      linhas.push(`Dividendos:         ${fmt(resumo.totalDividendos)} (Isentos - Cód. 09)`);
      linhas.push(`JCP Bruto:          ${fmt(resumo.totalJCP)} (Cód. 10)`);
      linhas.push(`IR sobre JCP:       ${fmt(jcpDevido.ir)} (17,5%)`);
      linhas.push(`Ganho de Capital:   ${fmt(ganhoCapital.totalLucro)}`);
      linhas.push(`IR Total Estimado:  ${fmt(darfs.reduce((s, d) => s + (d.imposto || 0), 0) + jcpDevido.ir)}`);
      linhas.push('');

      linhas.push('--- BENS E DIREITOS ---');
      for (const b of bens) {
        if (b.quantidade > 0 || b.investido !== 0) {
          linhas.push(`  ${b.ticker} | Grupo ${b.grupo} | Cód. ${b.codigo} | ${fmt(b.investido)}`);
          linhas.push(`    ${b.discriminacao}`);
        }
      }
      linhas.push('');

      if (darfs.length > 0) {
        linhas.push('--- DARFs A EMITIR ---');
        for (const d of darfs) {
          linhas.push(`  ${d.referencia}`);
          linhas.push(`    Código: ${d.codigoReceita} | Base: ${fmt(d.lucro)} | Alíq: ${d.aliquota}% | IR: ${fmt(d.imposto)}`);
        }
        linhas.push('');
      }

      if (alertas.length > 0) {
        linhas.push('--- ALERTAS ---');
        for (const a of alertas) {
          linhas.push(`  [${a.tipo.toUpperCase()}] ${a.mensagem}`);
        }
        linhas.push('');
      }

      linhas.push('='.repeat(60));
      linhas.push('  Este relatório é uma estimativa. Consulte um contador');
      linhas.push('  para validação antes da entrega da DIRPF.');
      linhas.push('='.repeat(60));

      const texto = linhas.join('\n');
      const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-irrf-${ano}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      setGerando(false);
    }, 500);
  };

  const copiarResumo = async () => {
    const linhas = [];
    linhas.push(`IRPF ${ano + 1} — Resumo`);
    linhas.push(`Compras: ${fmt(resumo.investidoCompras)}`);
    linhas.push(`Vendas: ${fmt(resumo.recebidoVendas)}`);
    linhas.push(`Dividendos: ${fmt(resumo.totalDividendos)}`);
    linhas.push(`JCP: ${fmt(resumo.totalJCP)} (IR: ${fmt(jcpDevido.ir)})`);
    linhas.push(`Ganho Capital: ${fmt(ganhoCapital.totalLucro)}`);
    linhas.push(`IR Total: ${fmt(darfs.reduce((s, d) => s + (d.imposto || 0), 0) + jcpDevido.ir)}`);
    try {
      await navigator.clipboard.writeText(linhas.join('\n'));
    } catch {
      const el = document.createElement('textarea');
      el.value = linhas.join('\n');
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={gerarRelatorio}
          disabled={gerando}
          style={{ padding: '10px 20px', background: 'var(--accent, #007bff)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: gerando ? 'wait' : 'pointer', fontWeight: 600 }}
        >
          {gerando ? 'Gerando...' : '📄 Baixar Relatório Completo (.txt)'}
        </button>
        <button
          onClick={copiarResumo}
          style={{ padding: '10px 20px', background: 'var(--card-bg, #fff)', color: 'var(--text, #333)', border: '1px solid var(--border, #ddd)', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
        >
          📋 Copiar Resumo
        </button>
      </div>

      <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #eee)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#000' }}>Preview do Relatório</h4>
        <pre style={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'var(--card-header, #f5f5f5)', color: '#000', padding: 12, borderRadius: 6, maxHeight: 400, overflow: 'auto' }}>
{`RELATÓRIO DE CONFERÊNCIA — IRPF ${ano + 1}
Ano-Calendário: ${ano}
Gerado em: ${new Date().toLocaleDateString('pt-BR')}

--- RESUMO FINANCEIRO ---
Compras no ano:     ${fmt(resumo.investidoCompras)}
Vendas no ano:      ${fmt(resumo.recebidoVendas)}
Dividendos:         ${fmt(resumo.totalDividendos)} (Isentos - Cód. 09)
JCP Bruto:          ${fmt(resumo.totalJCP)} (Cód. 10)
IR sobre JCP:       ${fmt(jcpDevido.ir)} (17,5%)
Ganho de Capital:   ${fmt(ganhoCapital.totalLucro)}
IR Total Estimado:  ${fmt(darfs.reduce((s, d) => s + (d.imposto || 0), 0) + jcpDevido.ir)}

--- BENS E DIREITOS (${bens.filter((b) => b.quantidade > 0 || b.investido !== 0).length} ativos) ---
${bens.filter((b) => b.quantidade > 0 || b.investido !== 0).map((b) => `  ${b.ticker} | Grupo ${b.grupo} | Cód. ${b.codigo} | ${fmt(b.investido)}\n    ${b.discriminacao}`).join('\n')}

${darfs.length > 0 ? `--- DARFs A EMITIR ---\n${darfs.map((d) => `  ${d.referencia}\n    Código: ${d.codigoReceita} | Base: ${fmt(d.lucro)} | Alíq: ${d.aliquota}% | IR: ${fmt(d.imposto)}`).join('\n')}\n` : ''}${alertas.length > 0 ? `--- ALERTAS ---\n${alertas.map((a) => `  [${a.tipo.toUpperCase()}] ${a.mensagem}`).join('\n')}\n` : ''}Este relatório é uma estimativa. Consulte um contador para validação.`}
        </pre>
      </div>
    </div>
  );
}

function fmt(v) {
  if (typeof v !== 'number' || isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
