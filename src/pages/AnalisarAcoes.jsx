import { useState, useMemo } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { formatCurrency } from '../services/format';

const mockIndicadores = {
  PETR4: {
    valuation: [
      { nome: 'P/L', valor: '5,82', avaliacao: 'bom' },
      { nome: 'P/VP', valor: '0,94', avaliacao: 'bom' },
      { nome: 'EV/EBITDA', valor: '3,41', avaliacao: 'bom' },
      { nome: 'Dividend Yield', valor: '14,52%', avaliacao: 'bom' },
      { nome: 'P/Ativos', valor: '0,72', avaliacao: 'bom' },
      { nome: 'P/Capital Giro', valor: '-3,21', avaliacao: 'neutro' },
      { nome: 'Preço sobre Vendas', valor: '0,68', avaliacao: 'bom' },
    ],
    eficiencia: [
      { nome: 'Margem Bruta', valor: '42,8%', avaliacao: 'bom' },
      { nome: 'Margem EBITDA', valor: '34,2%', avaliacao: 'bom' },
      { nome: 'Margem Líquida', valor: '14,6%', avaliacao: 'bom' },
      { nome: 'Giro Ativos', valor: '0,85', avaliacao: 'neutro' },
    ],
    endividamento: [
      { nome: 'Dívida Líquida/EBITDA', valor: '0,62', avaliacao: 'bom' },
      { nome: 'Dívida Líquida/Patrimônio', valor: '0,38', avaliacao: 'bom' },
      { nome: 'Dívida Bruta/Patrimônio', valor: '0,55', avaliacao: 'bom' },
      { nome: 'Passivo/Ativo', valor: '0,48', avaliacao: 'bom' },
      { nome: 'Liquidez Corrente', valor: '1,82', avaliacao: 'bom' },
    ],
    rentabilidade: [
      { nome: 'ROE', valor: '18,4%', avaliacao: 'bom' },
      { nome: 'ROA', valor: '8,2%', avaliacao: 'bom' },
      { nome: 'ROIC', valor: '15,6%', avaliacao: 'bom' },
      { nome: 'Margem Líquida', valor: '14,6%', avaliacao: 'bom' },
    ],
    crescimento: [
      { nome: 'Crescimento Receita (5a)', valor: '18,2%', avaliacao: 'bom' },
      { nome: 'Crescimento Lucro (5a)', valor: '22,4%', avaliacao: 'bom' },
      { nome: 'Crescimento EBITDA (5a)', valor: '16,8%', avaliacao: 'bom' },
    ],
  },
  VALE3: {
    valuation: [
      { nome: 'P/L', valor: '6,12', avaliacao: 'bom' },
      { nome: 'P/VP', valor: '1,18', avaliacao: 'neutro' },
      { nome: 'EV/EBITDA', valor: '3,85', avaliacao: 'bom' },
      { nome: 'Dividend Yield', valor: '11,80%', avaliacao: 'bom' },
      { nome: 'P/Ativos', valor: '0,89', avaliacao: 'bom' },
      { nome: 'Preço sobre Vendas', valor: '1,05', avaliacao: 'neutro' },
    ],
    eficiencia: [
      { nome: 'Margem Bruta', valor: '45,2%', avaliacao: 'bom' },
      { nome: 'Margem EBITDA', valor: '38,6%', avaliacao: 'bom' },
      { nome: 'Margem Líquida', valor: '18,3%', avaliacao: 'bom' },
      { nome: 'Giro Ativos', valor: '0,72', avaliacao: 'neutro' },
    ],
    endividamento: [
      { nome: 'Dívida Líquida/EBITDA', valor: '0,45', avaliacao: 'bom' },
      { nome: 'Dívida Líquida/Patrimônio', valor: '0,28', avaliacao: 'bom' },
      { nome: 'Dívida Bruta/Patrimônio', valor: '0,42', avaliacao: 'bom' },
      { nome: 'Passivo/Ativo', valor: '0,38', avaliacao: 'bom' },
      { nome: 'Liquidez Corrente', valor: '2,15', avaliacao: 'bom' },
    ],
    rentabilidade: [
      { nome: 'ROE', valor: '22,6%', avaliacao: 'bom' },
      { nome: 'ROA', valor: '10,4%', avaliacao: 'bom' },
      { nome: 'ROIC', valor: '18,2%', avaliacao: 'bom' },
    ],
    crescimento: [
      { nome: 'Crescimento Receita (5a)', valor: '12,5%', avaliacao: 'neutro' },
      { nome: 'Crescimento Lucro (5a)', valor: '15,8%', avaliacao: 'bom' },
      { nome: 'Crescimento EBITDA (5a)', valor: '11,2%', avaliacao: 'neutro' },
    ],
  },
  ITUB4: {
    valuation: [
      { nome: 'P/L', valor: '8,45', avaliacao: 'bom' },
      { nome: 'P/VP', valor: '1,32', avaliacao: 'neutro' },
      { nome: 'EV/EBITDA', valor: '6,18', avaliacao: 'neutro' },
      { nome: 'Dividend Yield', valor: '8,25%', avaliacao: 'bom' },
      { nome: 'Preço sobre Vendas', valor: '2,15', avaliacao: 'neutro' },
    ],
    eficiencia: [
      { nome: 'Margem Líquida', valor: '22,8%', avaliacao: 'bom' },
      { nome: 'ROE', valor: '16,5%', avaliacao: 'bom' },
      { nome: 'Giro Ativos', valor: '0,38', avaliacao: 'ruim' },
    ],
    endividamento: [
      { nome: 'Índice de Basileia', valor: '14,2%', avaliacao: 'bom' },
      { nome: 'Inadimplência', valor: '2,8%', avaliacao: 'neutro' },
      { nome: 'Despesas PD/Receita', valor: '42,5%', avaliacao: 'neutro' },
    ],
    rentabilidade: [
      { nome: 'ROE', valor: '16,5%', avaliacao: 'bom' },
      { nome: 'ROA', valor: '1,82%', avaliacao: 'neutro' },
      { nome: 'Spread Bancário', valor: '7,4%', avaliacao: 'bom' },
    ],
    crescimento: [
      { nome: 'Crescimento Lucro (5a)', valor: '8,5%', avaliacao: 'neutro' },
      { nome: 'Crescimento Carteira Crédito', valor: '10,2%', avaliacao: 'bom' },
    ],
  },
  BBAS3: {
    valuation: [
      { nome: 'P/L', valor: '5,80', avaliacao: 'bom' },
      { nome: 'P/VP', valor: '0,95', avaliacao: 'bom' },
      { nome: 'Dividend Yield', valor: '8,90%', avaliacao: 'bom' },
      { nome: 'Preço sobre Vendas', valor: '1,85', avaliacao: 'neutro' },
    ],
    eficiencia: [
      { nome: 'Margem Líquida', valor: '18,5%', avaliacao: 'bom' },
      { nome: 'ROE', valor: '18,2%', avaliacao: 'bom' },
      { nome: 'Índice de Eficiência', valor: '38,2%', avaliacao: 'bom' },
    ],
    endividamento: [
      { nome: 'Índice de Basileia', valor: '15,8%', avaliacao: 'bom' },
      { nome: 'Inadimplência', valor: '2,2%', avaliacao: 'bom' },
      { nome: 'Despesas PD/Receita', valor: '38,5%', avaliacao: 'bom' },
    ],
    rentabilidade: [
      { nome: 'ROE', valor: '18,2%', avaliacao: 'bom' },
      { nome: 'ROA', valor: '1,95%', avaliacao: 'neutro' },
      { nome: 'Spread Bancário', valor: '8,1%', avaliacao: 'bom' },
    ],
    crescimento: [
      { nome: 'Crescimento Lucro (5a)', valor: '12,4%', avaliacao: 'bom' },
      { nome: 'Crescimento Carteira Crédito', valor: '14,5%', avaliacao: 'bom' },
    ],
  },
  ABEV3: {
    valuation: [
      { nome: 'P/L', valor: '15,20', avaliacao: 'neutro' },
      { nome: 'P/VP', valor: '2,85', avaliacao: 'ruim' },
      { nome: 'EV/EBITDA', valor: '10,45', avaliacao: 'neutro' },
      { nome: 'Dividend Yield', valor: '5,80%', avaliacao: 'neutro' },
      { nome: 'Preço sobre Vendas', valor: '2,50', avaliacao: 'neutro' },
    ],
    eficiencia: [
      { nome: 'Margem Bruta', valor: '62,5%', avaliacao: 'bom' },
      { nome: 'Margem EBITDA', valor: '32,8%', avaliacao: 'bom' },
      { nome: 'Margem Líquida', valor: '18,2%', avaliacao: 'bom' },
      { nome: 'Giro Ativos', valor: '0,55', avaliacao: 'neutro' },
    ],
    endividamento: [
      { nome: 'Dívida Líquida/EBITDA', valor: '1,85', avaliacao: 'neutro' },
      { nome: 'Dívida Líquida/Patrimônio', valor: '1,12', avaliacao: 'ruim' },
      { nome: 'Liquidez Corrente', valor: '0,95', avaliacao: 'neutro' },
    ],
    rentabilidade: [
      { nome: 'ROE', valor: '18,5%', avaliacao: 'bom' },
      { nome: 'ROA', valor: '6,8%', avaliacao: 'neutro' },
      { nome: 'ROIC', valor: '14,2%', avaliacao: 'bom' },
    ],
    crescimento: [
      { nome: 'Crescimento Receita (5a)', valor: '4,2%', avaliacao: 'ruim' },
      { nome: 'Crescimento Lucro (5a)', valor: '3,8%', avaliacao: 'ruim' },
    ],
  },
  WEGE3: {
    valuation: [
      { nome: 'P/L', valor: '28,50', avaliacao: 'ruim' },
      { nome: 'P/VP', valor: '6,20', avaliacao: 'ruim' },
      { nome: 'EV/EBITDA', valor: '18,40', avaliacao: 'ruim' },
      { nome: 'Dividend Yield', valor: '2,15%', avaliacao: 'ruim' },
      { nome: 'Preço sobre Vendas', valor: '3,80', avaliacao: 'ruim' },
    ],
    eficiencia: [
      { nome: 'Margem Bruta', valor: '38,5%', avaliacao: 'bom' },
      { nome: 'Margem EBITDA', valor: '22,4%', avaliacao: 'bom' },
      { nome: 'Margem Líquida', valor: '14,8%', avaliacao: 'bom' },
      { nome: 'Giro Ativos', valor: '0,92', avaliacao: 'bom' },
    ],
    endividamento: [
      { nome: 'Dívida Líquida/EBITDA', valor: '0,15', avaliacao: 'bom' },
      { nome: 'Dívida Líquida/Patrimônio', valor: '0,08', avaliacao: 'bom' },
      { nome: 'Liquidez Corrente', valor: '3,45', avaliacao: 'bom' },
    ],
    rentabilidade: [
      { nome: 'ROE', valor: '25,8%', avaliacao: 'bom' },
      { nome: 'ROA', valor: '10,2%', avaliacao: 'bom' },
      { nome: 'ROIC', valor: '22,5%', avaliacao: 'bom' },
    ],
    crescimento: [
      { nome: 'Crescimento Receita (5a)', valor: '15,5%', avaliacao: 'bom' },
      { nome: 'Crescimento Lucro (5a)', valor: '18,2%', avaliacao: 'bom' },
      { nome: 'Crescimento EBITDA (5a)', valor: '14,8%', avaliacao: 'bom' },
    ],
  },
};

const defaultIndicador = {
  valuation: [
    { nome: 'Selecione um ticker', valor: '—', avaliacao: 'neutro' },
  ],
  eficiencia: [
    { nome: 'Selecione um ticker', valor: '—', avaliacao: 'neutro' },
  ],
  endividamento: [
    { nome: 'Selecione um ticker', valor: '—', avaliacao: 'neutro' },
  ],
  rentabilidade: [
    { nome: 'Selecione um ticker', valor: '—', avaliacao: 'neutro' },
  ],
  crescimento: [
    { nome: 'Selecione um ticker', valor: '—', avaliacao: 'neutro' },
  ],
};

const avaliacaoCores = {
  bom: { cor: '#00CC66', label: 'Bom' },
  neutro: { cor: '#C8B800', label: 'Neutro' },
  ruim: { cor: '#FF5555', label: 'Ruim' },
};

const secaoConfig = [
  { key: 'valuation', titulo: 'Indicadores de Valuation', icone: '📊' },
  { key: 'eficiencia', titulo: 'Indicadores de Eficiência', icone: '⚡' },
  { key: 'endividamento', titulo: 'Indicadores de Endividamento', icone: '⚖️' },
  { key: 'rentabilidade', titulo: 'Indicadores de Rentabilidade', icone: '📈' },
  { key: 'crescimento', titulo: 'Indicadores de Crescimento', icone: '🚀' },
];

function AnalisarAcoes() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const [ticker, setTicker] = useState('');

  const tickersDisponiveis = useMemo(() => {
    const acoes = [...new Set(transactions
      .filter(t => /[0-9]/.test(t.ticker) && !t.ticker.endsWith('11'))
      .map(t => t.ticker))].sort();
    return acoes;
  }, [transactions]);

  const indicadorAtual = mockIndicadores[ticker] || defaultIndicador;

  const totalProventos = useMemo(() => {
    if (!ticker) return 0;
    return proventos
      .filter(p => p.ticker === ticker)
      .reduce((s, p) => s + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0);
  }, [proventos, ticker]);

  const ativo = useMemo(() => {
    if (!ticker) return null;
    const t = transactions.find(t => t.ticker === ticker);
    return t || null;
  }, [transactions, ticker]);

  return (
    <div>
      <h1>Analisar Ações</h1>
      <p className="subtitle">Indicadores fundamentalistas das ações da sua carteira</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ color: '#CCC', fontSize: '0.9em' }}>Selecione o ativo:</span>
        <select
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          style={{
            background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #C8B800AA',
            borderRadius: 8, padding: '8px 14px', fontSize: '0.9em', fontFamily: 'inherit',
            cursor: 'pointer', outline: 'none', minWidth: 160, textAlign: 'center',
          }}
        >
          <option value="">Selecione...</option>
          {tickersDisponiveis.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {ticker && (
          <span style={{ color: '#888', fontSize: '0.85em' }}>
            Total proventos recebidos: <strong style={{ color: '#00CC66' }}>{formatCurrency(totalProventos)}</strong>
          </span>
        )}
      </div>

      {ticker && ativo && (
        <div style={{
          background: '#151515', border: '1px solid #2A2A2A', borderRadius: 10,
          padding: '14px 20px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: '1.3em', fontWeight: 700, color: '#C8B800' }}>{ticker}</span>
            <span style={{ color: '#888', fontSize: '0.85em' }}>{ativo.ativo}</span>
            <span style={{
              fontSize: '0.75em', padding: '3px 10px', borderRadius: 6,
              background: '#2A2A2A', color: '#CCC',
            }}>{ativo.tipo}</span>
            <span style={{
              fontSize: '0.75em', padding: '3px 10px', borderRadius: 6,
              background: ativo.segmento ? '#2A2A2A' : 'transparent',
              color: '#888',
            }}>{ativo.segmento || ativo.cnpj ? `CNPJ: ${ativo.cnpj}` : ''}</span>
          </div>
        </div>
      )}

      {ticker && secaoConfig.map(secao => (
        <div key={secao.key} style={{
          background: '#151515', border: '1px solid #2A2A2A', borderRadius: 10,
          marginBottom: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid #2A2A2A',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{secao.icone}</span>
            <span style={{ color: '#C8B800', fontWeight: 700, fontSize: '0.9em', letterSpacing: '1px' }}>
              {secao.titulo}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0D0D0D' }}>
                <th style={{ padding: '8px 20px', textAlign: 'left', color: '#888', fontSize: '0.8em', fontWeight: 600, borderBottom: '1px solid #2A2A2A' }}>
                  Indicador
                </th>
                <th style={{ padding: '8px 20px', textAlign: 'center', color: '#888', fontSize: '0.8em', fontWeight: 600, borderBottom: '1px solid #2A2A2A', width: 120 }}>
                  Valor
                </th>
                <th style={{ padding: '8px 20px', textAlign: 'center', color: '#888', fontSize: '0.8em', fontWeight: 600, borderBottom: '1px solid #2A2A2A', width: 100 }}>
                  Avaliação
                </th>
              </tr>
            </thead>
            <tbody>
              {indicadorAtual[secao.key].map((ind, i) => {
                const aval = avaliacaoCores[ind.avaliacao] || avaliacaoCores.neutro;
                return (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    transition: 'background 0.2s',
                  }}>
                    <td style={{ padding: '8px 20px', color: '#E0E0E0', fontSize: '0.88em', borderBottom: '1px solid #1A1A1A' }}>
                      {ind.nome}
                    </td>
                    <td style={{
                      padding: '8px 20px', textAlign: 'center', color: '#FFF',
                      fontSize: '0.9em', fontWeight: 700, fontFamily: "'Consolas', monospace",
                      borderBottom: '1px solid #1A1A1A',
                    }}>
                      {ind.valor}
                    </td>
                    <td style={{
                      padding: '8px 20px', textAlign: 'center', borderBottom: '1px solid #1A1A1A',
                    }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 12px', borderRadius: 6,
                        fontSize: '0.78em', fontWeight: 700,
                        background: `${aval.cor}22`, color: aval.cor,
                        border: `1px solid ${aval.cor}44`,
                      }}>
                        {aval.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {!ticker && (
        <div className="page-placeholder" style={{ height: '60%' }}>
          <div className="icon">📊</div>
          <h2>Análise de Ações</h2>
          <p>Selecione um ativo acima para visualizar seus indicadores fundamentalistas.</p>
        </div>
      )}
    </div>
  );
}

export default AnalisarAcoes;