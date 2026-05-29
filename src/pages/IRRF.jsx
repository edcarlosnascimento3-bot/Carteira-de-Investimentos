import { useState, useMemo, useEffect } from 'react';
import { useProventos } from '../context/ProventosContext';
import { useTransactions } from '../context/TransactionsContext';
import { formatCurrency, formatNumber } from '../services/format';

const tabs = [
  { id: 'isentos', label: 'Isentos e Não Tributáveis' },
  { id: 'tributacao', label: 'Sujeitos a Tributação' },
  { id: 'bens', label: 'Bens e Direitos' },
  { id: 'pagamentos', label: 'Pagamentos Efetuados' },
  { id: 'ganhos', label: 'Ganhos de Capital' },
];

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  color: '#666666',
  fontWeight: 500,
  fontSize: '0.8em',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  borderBottom: '1px solid #2A2A2A',
};

const tdStyle = {
  padding: '10px 14px',
  borderBottom: '1px solid #1A1A1A',
};

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(y, m - 1, d);
}

function dateToStr(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function IRRF() {
  const { proventos } = useProventos();
  const { transactions } = useTransactions();
  const [activeTab, setActiveTab] = useState('isentos');
  const [selectedAno, setSelectedAno] = useState(null);

  const anos = useMemo(() => {
    return [...new Set(proventos.map(p => p.ano))].sort((a, b) => b - a);
  }, [proventos]);

  useEffect(() => {
    if (anos.length > 0 && selectedAno === null) {
      setSelectedAno(anos[0]);
    }
  }, [anos, selectedAno]);

  const isentosData = useMemo(() => {
    if (!selectedAno) return [];
    const refAno = selectedAno - 1;
    const tickerInfo = {};
    transactions.forEach(t => {
      if (!tickerInfo[t.ticker]) {
        tickerInfo[t.ticker] = { cnpj: t.cnpj || '' };
      }
    });
    const map = {};
    proventos.filter(p => p.ano === refAno).forEach(p => {
      const t = p.ticker;
      if (!map[t]) {
        map[t] = { ticker: t, nome: p.nome, tipo: p.tipo, total: 0, cnpj: tickerInfo[t]?.cnpj || '' };
      }
      map[t].total += p.tipo && p.tipo.includes('FII') ? (p.rendimento || 0) + (p.reembolso || 0) : (p.dividendos || 0);
    });
    return Object.values(map)
      .map(item => ({ ...item, total: Math.round(item.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }, [proventos, selectedAno, transactions]);

  const tributacaoData = useMemo(() => {
    if (!selectedAno) return [];
    const rows = [];
    const jcpMap = {};
    const rendMap = {};
    const tickerInfo = {};
    transactions.forEach(t => {
      if (!tickerInfo[t.ticker]) {
        tickerInfo[t.ticker] = { cnpj: t.cnpj || '' };
      }
    });
    proventos.filter(p => p.ano === selectedAno && p.tipo === 'Ação').forEach(p => {
      const t = p.ticker;
      const info = tickerInfo[t] || {};
      if ((p.jcp || 0) > 0) {
        if (!jcpMap[t]) jcpMap[t] = { ticker: t, nome: p.nome, tipo: 'JCP', total: 0, cnpj: info.cnpj || '' };
        jcpMap[t].total += (p.jcp || 0);
      }
      if ((p.rendimento || 0) > 0) {
        if (!rendMap[t]) rendMap[t] = { ticker: t, nome: p.nome, tipo: 'REND', total: 0, cnpj: info.cnpj || '' };
        rendMap[t].total += (p.rendimento || 0);
      }
    });
    Object.values(jcpMap).forEach(item => {
      rows.push({ ...item, total: Math.round(item.total * 100) / 100 });
    });
    Object.values(rendMap).forEach(item => {
      rows.push({ ...item, total: Math.round(item.total * 100) / 100 });
    });
    return rows.sort((a, b) => b.total - a.total);
  }, [proventos, selectedAno, transactions]);

  const bensData = useMemo(() => {
    if (!selectedAno) return [];
    const refAno = selectedAno - 1;
    const xxAno = selectedAno - 2;
    const zzAno = selectedAno - 3;
    const xxxAno = selectedAno - 1;
    const refStart = new Date(refAno, 0, 1);
    const refEnd = new Date(refAno, 11, 31);
    const xxEnd = new Date(xxAno, 11, 31);
    const zzEnd = new Date(zzAno, 11, 31);
    const selectedEnd = new Date(selectedAno, 11, 31);

    const tickers = {};
    transactions.forEach(t => {
      if (!tickers[t.ticker]) {
        tickers[t.ticker] = { ticker: t.ticker, cnpj: t.cnpj, tipo: t.tipo, nome: t.ativo, segmento: t.segmento };
      }
    });

    const excludedTickers = ['SOFISA', 'XP INVEST', 'RESERVA', '99 PAY'];

    const result = [];
    Object.values(tickers).forEach(({ ticker, cnpj, tipo, nome, segmento }) => {
      if (excludedTickers.includes(ticker)) return;
      if (!['Ação', 'FII'].includes(tipo)) return;
      const txList = transactions.filter(t => t.ticker === ticker);

      let cotasCompradasRef = 0;
      let investidoRef = 0;
      let cotasVendidasRef = 0;
      let valorVendaRef = 0;
      let cotasAllTime = 0;
      let investidoAllTime = 0;
      let investidoXX = 0;
      let investidoXXX = 0;
      let investidoAteRef = 0;
      let investidoAteXX = 0;
      let investidoAteSelected = 0;
      let cotasAteXX = 0;
      let cotasAteRef = 0;
      txList.forEach(t => {
        const tDate = parseDate(t.data);
        const qtd = t.operacao === 'Compra' ? t.quantidade : -t.quantidade;

        if (t.operacao === 'Compra') {
          if (tDate >= refStart && tDate <= refEnd) {
            cotasCompradasRef += t.quantidade;
            investidoRef += t.investido;
          }
          if (tDate.getFullYear() === xxAno) investidoXX += t.investido;
          if (tDate.getFullYear() === xxxAno) investidoXXX += t.investido;
          if (tDate <= refEnd) investidoAteRef += t.investido;
          if (tDate <= xxEnd) investidoAteXX += t.investido;
          if (tDate <= selectedEnd) investidoAteSelected += t.investido;
          investidoAllTime += t.investido;
        } else if (t.operacao === 'Venda') {
          if (tDate >= refStart && tDate <= refEnd) {
            cotasVendidasRef += t.quantidade;
            valorVendaRef += t.investido;
          }
        }
        cotasAllTime += qtd;
        if (tDate <= xxEnd) cotasAteXX += qtd;
        if (tDate <= refEnd) cotasAteRef += qtd;
      });

      const pmRef = cotasCompradasRef > 0 ? investidoRef / cotasCompradasRef : 0;
      const pmTotal = cotasAllTime > 0 ? investidoAllTime / cotasAllTime : 0;
      const txOrdenadas = [...txList].sort((a, b) => parseDate(b.data) - parseDate(a.data));
      const patrimonioTotal = txOrdenadas[0]?.patrimonio || 0;

      const pmVenda = cotasVendidasRef > 0 ? valorVendaRef / cotasVendidasRef : 0;
      const custoVenda = cotasVendidasRef > 0 ? cotasVendidasRef * (pmRef || pmTotal) : 0;
      const lucroPerda = valorVendaRef - custoVenda;
      const situacaoRef = investidoAteRef - custoVenda;

      let grupo;
      let codigoReceita;
      if (tipo === 'Ação') {
        grupo = '03 - Participações Societárias';
        codigoReceita = '01';
      } else if (tipo === 'FII' && segmento === 'Agronegócio') {
        grupo = '07 - Fundos de Investimento Imobiliário';
        codigoReceita = '02';
      } else if (tipo === 'FII') {
        grupo = '07 - Fundos de Investimento Imobiliário';
        codigoReceita = '03';
      } else {
        grupo = '99 - Outros Bens';
        codigoReceita = '99';
      }

      let discriminacao =
        `${ticker} - NO PERÍODO DE 01/01/${refAno} A 31/12/${refAno} FORAM COMPRADAS ` +
        `${cotasCompradasRef} COTAS DO ATIVO ${ticker}, CNPJ ${cnpj}. ` +
        `O VALOR DO INVESTIMENTO DO PERÍODO FOI DE R$ ${formatNumber(investidoRef)}, ` +
        `COM UM PREÇO MÉDIO DE R$ ${formatNumber(pmRef)}. ` +
        `NO ACUMULADO TOTAL INVESTIDO NESSE ATIVO NA CARTEIRA CONSTA R$ ${formatNumber(investidoAteRef)}, ` +
        `COM UM PREÇO MÉDIO DESSE ATIVO NA CARTEIRA DE R$ ${formatNumber(pmTotal)}.`;

      if (cotasVendidasRef === 0) {
        discriminacao += `\n\nNÃO HOUVE VENDAS DESSE ATIVO NESSE PERÍODO.`;
      }

      result.push({
        ticker, grupo, codigoReceita, cnpj, nome,
        discriminacao,
        investidoXX: Math.round(investidoXX * 100) / 100,
        investidoAteXX: Math.round(investidoAteXX * 100) / 100,
        investidoAteRef: Math.round(situacaoRef * 100) / 100,
      });
    });

    return result.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [transactions, selectedAno]);

  const ganhosData = useMemo(() => {
    if (!selectedAno) return [];
    const selectedStart = new Date(selectedAno, 0, 1);
    const selectedEnd = new Date(selectedAno, 11, 31);

    const tickers = {};
    transactions.forEach(t => {
      if (!tickers[t.ticker]) {
        tickers[t.ticker] = { ticker: t.ticker, tipo: t.tipo };
      }
    });

    const excludedTickers = ['SOFISA', 'XP INVEST', 'RESERVA', '99 PAY'];

    const result = [];
    Object.values(tickers).forEach(({ ticker, tipo }) => {
      if (excludedTickers.includes(ticker)) return;
      if (!['Ação', 'FII'].includes(tipo)) return;
      const txList = transactions.filter(t => t.ticker === ticker);

      let compra = 0;
      let venda = 0;
      const anosVenda = new Set();
      txList.forEach(t => {
        const tDate = parseDate(t.data);
        if (!tDate || tDate < selectedStart || tDate > selectedEnd) return;
        if (t.operacao === 'Compra') compra += t.investido;
        else if (t.operacao === 'Venda') {
          venda += t.investido;
          anosVenda.add(tDate.getFullYear());
        }
      });

      result.push({
        ticker,
        compra: Math.round(compra * 100) / 100,
        venda: Math.round(venda * 100) / 100,
        saldo: Math.round((venda - compra) * 100) / 100,
        anoVenda: [...anosVenda].sort((a, b) => b - a).join(', '),
      });
    });

    return result
      .filter(item => item.anoVenda)
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [transactions, selectedAno]);

  const refAno = selectedAno ? selectedAno - 1 : null;
  const xxLabel = selectedAno ? `31/12/${selectedAno - 2}` : 'XX';
  const xxxLabel = selectedAno ? `31/12/${selectedAno - 1}` : 'XXX';

  return (
    <div>
      <h1>IRRF</h1>
      <p className="subtitle">
        Imposto de Renda Retido na Fonte - acompanhamento fiscal
      </p>

      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '25px',
        borderBottom: '1px solid #2A2A2A',
        paddingBottom: '2px',
        flexWrap: 'wrap',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#151515' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #C8B800' : '2px solid transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#999999',
              padding: '10px 18px',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontFamily: 'inherit',
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'isentos' || activeTab === 'tributacao') && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione o ano desejado
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedAno || ''}
              onChange={e => setSelectedAno(Number(e.target.value))}
              style={{
                background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
                padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div style={{
            background: '#151515',
            border: '1px solid #2A2A2A',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9em',
            }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Descrição</th>
                  <th style={thStyle}>Ticker</th>
                  <th style={thStyle}>Fonte Pagadora</th>
                  {activeTab === 'isentos' && <th style={thStyle}>Discrição</th>}
                  <th style={{ ...thStyle, textAlign: 'center' }}>CNPJ</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 50 }}></th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                  {activeTab === 'isentos' && isentosData.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'isentos' ? 9 : 8} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 30 }}>
                        Nenhum rendimento encontrado para {selectedAno}
                      </td>
                    </tr>
                  )}
                  {activeTab === 'tributacao' && tributacaoData.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'isentos' ? 9 : 8} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 30 }}>
                        Nenhum rendimento encontrado para {selectedAno}
                      </td>
                    </tr>
                  )}
                {activeTab === 'isentos' && isentosData.map((item, i) => (
                  <tr
                    key={item.ticker}
                    style={{ transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A00'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{item.tipo !== 'Ação' ? '99 - Outros' : '09 - Lucros e Dividendos Recebidos'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</td>
                    <td style={tdStyle}>{item.nome}</td>
                    <td style={tdStyle}>{item.tipo && item.tipo.includes('FII') ? 'Aplicações financeiras em fundos de investimento imobiliario' : ''}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ color: '#E0E0E0', fontFamily: "'Consolas', monospace" }}>
                        {item.cnpj || '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {item.cnpj && (
                        <span
                          onClick={() => navigator.clipboard.writeText(item.cnpj)}
                          style={{ cursor: 'pointer', display: 'inline-flex', color: '#999999', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#C8B800'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                          title="Copiar CNPJ"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#00CC66', fontWeight: 600 }}>
                      {formatCurrency(item.total)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span
                        onClick={() => navigator.clipboard.writeText(formatNumber(item.total))}
                          style={{ cursor: 'pointer', display: 'inline-flex', color: '#999999', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#C8B800'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                          title="Copiar valor"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </span>
                      </td>
                    </tr>
                  ))}
                   {activeTab === 'tributacao' && tributacaoData.map((item, i) => (
                    <tr
                      key={`${item.ticker}-${item.tipo}`}
                      style={{ transition: 'background 0.2s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A00'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{item.tipo === 'JCP' ? '10 - Juros sobre capital próprio' : '06 - Rendimentos sobre aplicações financeiras'}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</td>
                      <td style={tdStyle}>{item.nome}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ color: '#E0E0E0', fontFamily: "'Consolas', monospace" }}>
                          {item.cnpj || '—'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {item.cnpj && (
                          <span
                            onClick={() => navigator.clipboard.writeText(item.cnpj)}
                            style={{ cursor: 'pointer', display: 'inline-flex', color: '#999999', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#C8B800'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                            title="Copiar CNPJ"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#00CC66', fontWeight: 600 }}>
                        {formatCurrency(item.total)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          onClick={() => navigator.clipboard.writeText(formatNumber(item.total))}
                        style={{ cursor: 'pointer', display: 'inline-flex', color: '#999999', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#C8B800'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                        title="Copiar valor"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bens' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione o ano desejado
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedAno || ''}
              onChange={e => setSelectedAno(Number(e.target.value))}
              style={{
                background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
                padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div style={{
            background: '#151515',
            border: '1px solid #2A2A2A',
            borderRadius: 12,
            overflow: 'auto',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85em',
            }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Ticker</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Grupo</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Código</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Localização</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Situação em {xxLabel}</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Situação em {xxxLabel}</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Discriminação</th>
                  <th style={{ ...thStyle, textAlign: 'center', width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {bensData.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 30 }}>
                      Nenhum ativo encontrado
                    </td>
                  </tr>
                )}
                {bensData.map((item, i) => (
                  <tr
                    key={item.ticker}
                    style={{ transition: 'background 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A00'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.grupo}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.codigoReceita}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>105 - Brasil</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{formatCurrency(item.investidoAteXX)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{formatCurrency(item.investidoAteRef)}</td>
                    <td style={{ ...tdStyle, textAlign: 'justify', fontSize: '0.8em', lineHeight: 1.4, maxWidth: 350, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {item.discriminacao}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span
                        onClick={() => navigator.clipboard.writeText(item.discriminacao)}
                        style={{ cursor: 'pointer', display: 'inline-flex', color: '#999999', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#C8B800'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                        title="Copiar discriminação"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab !== 'isentos' && activeTab !== 'tributacao' && activeTab !== 'bens' && activeTab !== 'ganhos') && (
        <div style={{
          background: '#151515',
          border: '1px solid #2A2A2A',
          borderRadius: 12,
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '3em', marginBottom: 16 }}>📄</div>
          <h3 style={{ color: '#E0E0E0', marginBottom: 8, fontWeight: 600 }}>
            {tabs.find(t => t.id === activeTab)?.label}
          </h3>
          <p style={{ color: '#999999', fontSize: '0.95em', maxWidth: 500, margin: '0 auto' }}>
            Em desenvolvimento
          </p>
        </div>
      )}

      {activeTab === 'ganhos' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ color: '#E0E0E0', fontSize: '0.95em', fontWeight: 600 }}>
              Selecione o ano desejado
            </span>
            <span style={{ color: '#FF0000', fontSize: '2em', lineHeight: 1 }}>➡</span>
            <select
              value={selectedAno || ''}
              onChange={e => setSelectedAno(Number(e.target.value))}
              style={{
                background: '#0D0D0D', color: '#E0E0E0', border: '1px solid #2A2A2A', borderRadius: 6,
                padding: '6px 12px', fontSize: '1em', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div style={{
            background: '#151515',
            border: '1px solid #2A2A2A',
            borderRadius: 12,
            overflow: 'auto',
          }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>#</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>TICKER</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>COMPRA</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>VENDA</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>SALDO</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>ANO DA VENDA</th>
              </tr>
            </thead>
            <tbody>
              {ganhosData.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#666', padding: 30 }}>
                    Nenhum ativo encontrado
                  </td>
                </tr>
              )}
              {ganhosData.map((item, i) => (
                <tr
                  key={item.ticker}
                  style={{ transition: 'background 0.2s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1A1A00'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#FFFFFF' }}>{item.ticker}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#00CC66', fontWeight: 600 }}>{formatCurrency(item.compra)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#FF5555', fontWeight: 600 }}>{formatCurrency(item.venda)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: item.saldo >= 0 ? '#00CC66' : '#FF5555', fontWeight: 600 }}>{formatCurrency(item.saldo)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#E0E0E0' }}>{item.anoVenda || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default IRRF;
