import { useMemo, useState } from 'react';
import { formatCurrency } from '../services/format';
import { useTransactions } from '../context/TransactionsContext';
import { useProventos } from '../context/ProventosContext';
import { useRfManual } from '../context/RfManualContext';
import { usePrices } from '../hooks/usePrices';
import LogoImage from '../components/LogoImage';
import { ETFS_RENDA_FIXA } from '../data/etfRendaFixa';

const typeIcons = {
  'Ação': '📈',
  'FII': '🏗️',
  'Renda Fixa': '🔒',
};

const typeColors = {
  'Ação': '#C8B800',
  'FII': '#CC8800',
  'Renda Fixa': '#0099CC',
};

const borderColors = {
  'Ação': '#FF3333',         // Vermelho
  'FII': '#00CC66',          // Verde
  'Renda Fixa': '#FFD700',   // Amarelo
  'Dólar': '#D485FF',        // Lilás
  'Euro': '#D485FF',         // Lilás
  'Criptoativo': '#3399FF',  // Azul
  'Cripto': '#3399FF',       // Azul
  'Criptoativos': '#3399FF', // Azul
  'Ouro': '#FFD700',
};

function Principal() {
  const { transactions } = useTransactions();
  const { proventos } = useProventos();
  const { rfManual } = useRfManual();

  const tickers = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.ticker]) groups[t.ticker] = { qtdCompra: 0, qtdVenda: 0, tipo: t.tipo };
      if (t.operacao === 'Compra') groups[t.ticker].qtdCompra += t.quantidade;
      else groups[t.ticker].qtdVenda += t.quantidade;
    });
    const portfolioTickers = Object.entries(groups)
      .filter(([, g]) => g.qtdCompra - g.qtdVenda > 0 && !['Dólar', 'Euro'].includes(g.tipo))
      .map(([ticker]) => ticker);
    
    const tipos = new Set(transactions.map((t) => t.tipo.replace(/Fii/g, 'FII')));
    if (tipos.has('Dólar') && !portfolioTickers.includes('USDBRL')) portfolioTickers.push('USDBRL');
    if (tipos.has('Euro') && !portfolioTickers.includes('EURBRL')) portfolioTickers.push('EURBRL');
    
    return [...new Set(portfolioTickers)];
  }, [transactions]);

  const rfTickers = useMemo(() => {
    const set = new Set();
    transactions.forEach(t => {
      if (t.tipo && t.tipo.replace(/Fii/g, 'FII') === 'Renda Fixa') set.add(t.ticker);
    });
    return set;
  }, [transactions]);

  const { prices, changes } = usePrices(tickers);

  const portfolio = useMemo(() => {
    const groups = {};
    transactions.forEach((t) => {
      if (!groups[t.ticker]) {
        groups[t.ticker] = {
          ticker: t.ticker, ativo: t.ativo, tipo: t.tipo.replace(/Fii/g, 'FII'),
          qtdCompra: 0, qtdVenda: 0, investidoCompra: 0, investidoVenda: 0,
        };
      }
      const g = groups[t.ticker];
      if (t.operacao === 'Compra') {
        g.qtdCompra += t.quantidade;
        g.investidoCompra += t.investido;
      } else {
        g.qtdVenda += t.quantidade;
        g.investidoVenda += t.investido;
      }
    });
    return Object.values(groups).map((g) => {
      const quantidade = g.qtdCompra - g.qtdVenda;
      const investido = g.investidoCompra - g.investidoVenda;
      const precoMedio = quantidade > 0 ? investido / quantidade : 0;
      const tipoNorm = g.tipo.replace(/Fii/g, 'FII');
      const precificadoMercado = ETFS_RENDA_FIXA.includes(g.ticker);
      const isManual = ['Renda Fixa', 'Dólar', 'Euro'].includes(tipoNorm) && !precificadoMercado;
      const manualTotal = precificadoMercado ? null : rfManual[g.ticker];
      const cotacao = isManual && manualTotal != null && tipoNorm !== 'Renda Fixa'
        ? manualTotal / quantidade
        : tipoNorm === 'Renda Fixa'
          ? precificadoMercado ? prices[g.ticker] : precoMedio
          : tipoNorm === 'Dólar'
            ? prices['USDBRL']
            : tipoNorm === 'Euro'
              ? prices['EURBRL']
              : prices[g.ticker];
      const atual = tipoNorm === 'Renda Fixa' && manualTotal != null && !precificadoMercado
        ? manualTotal
        : cotacao != null ? quantidade * cotacao : 0;
      const resultado = atual - investido;
      return { ...g, quantidade, investido, precoMedio, cotacao, atual, resultado };
    }).filter((g) => g.quantidade > 0);
  }, [transactions, prices, rfManual]);

  const sortedPortfolio = useMemo(() => {
    return [...portfolio].sort((a, b) => b.atual - a.atual || a.ticker.localeCompare(b.ticker));
  }, [portfolio]);

  const totals = useMemo(() => {
    const patrimonio = portfolio.reduce((s, a) => s + a.atual, 0);
    const investido = portfolio.reduce((s, a) => s + a.investido, 0);
    const diferenca = patrimonio - investido;
    const rendimentoPct = investido > 0 ? (diferenca / investido) * 100 : 0;
    const totalTax = transactions.reduce((s, t) => s + t.taxa, 0);
    return { patrimonio, investido, diferenca, rendimentoPct, totalTax };
  }, [portfolio, transactions]);

  const dividendosMes = useMemo(() => {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const ano = agora.getFullYear();
    return proventos
      .filter((p) => {
        const partes = p.data?.split('/');
        return partes && partes[1] === mes && Number(partes[2]) === ano;
      })
      .reduce((soma, p) => soma + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0);
  }, [proventos]);

  const dividendosAcumulado = useMemo(() => {
    return proventos.reduce((soma, p) => soma + (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0), 0);
  }, [proventos]);

  const rendimentosAno = useMemo(() => {
    const ano = new Date().getFullYear();
    return proventos
      .filter((p) => {
        const partes = p.data?.split('/');
        return partes && Number(partes[2]) === ano;
      })
      .reduce((soma, p) => soma + (p.rendimento || 0), 0);
  }, [proventos]);

  const formatNumber = (v) =>
    v.toLocaleString('pt-BR');

  const [selectedTicker, setSelectedTicker] = useState(null);
  const [closing, setClosing] = useState(false);

  const closeModal = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setSelectedTicker(null);
    }, 1400);
  };

  const assetModalInfo = useMemo(() => {
    if (!selectedTicker) return null;
    const txList = transactions.filter(t => t.ticker === selectedTicker && t.operacao === 'Compra');
    const compraDates = txList.map(t => t.data).filter(Boolean);
    const precos = txList.map(t => t.valor).filter(v => v != null);
    const asset = portfolio.find(a => a.ticker === selectedTicker);
    const qtdTotal = asset?.quantidade || 0;
    const investidoTotal = asset?.investido || 0;
    const atualTotal = asset?.atual || 0;
    const valorizacaoPct = investidoTotal > 0 ? ((atualTotal - investidoTotal) / investidoTotal) * 100 : 0;
    const firstDate = compraDates.length > 0 ? compraDates.sort((a, b) => a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join('')))[0] : '—';
    const lastDate = compraDates.length > 0 ? compraDates.sort((a, b) => b.split('/').reverse().join('').localeCompare(a.split('/').reverse().join('')))[0] : '—';
    const maxPreco = precos.length > 0 ? Math.max(...precos) : null;
    const minPreco = precos.length > 0 ? Math.min(...precos) : null;

    const provList = proventos.filter(p => p.ticker === selectedTicker);
    const divsPorCota = provList.map(p => {
      const total = (p.dividendos || 0) + (p.jcp || 0) + (p.rendimento || 0) + (p.reembolso || 0);
      return qtdTotal > 0 ? total / qtdTotal : 0;
    }).filter(v => v > 0);
    const maxDiv = divsPorCota.length > 0 ? Math.max(...divsPorCota) : null;
    const minDiv = divsPorCota.length > 0 ? Math.min(...divsPorCota) : null;

    return { ticker: selectedTicker, qtdTotal, investidoTotal, atualTotal, valorizacaoPct, firstDate, lastDate, maxPreco, minPreco, maxDiv, minDiv };
  }, [selectedTicker, transactions, proventos, portfolio]);

  const tickerItems = tickers
    .filter((t) => !rfTickers.has(t))
    .map((t) => ({
      ticker: t,
      price: prices[t] ?? 0,
      change: changes[t] ?? 0,
    }));

  return (
    <div>
      <div className="ticker-tape">
        <div className="ticker-track">
          {tickerItems.map((item, i) => {
            const color = item.change >= 0 ? '#00CC66' : '#FF5555';
            return (
              <span key={i} className="ticker-item">
                <span className="ticker-symbol">{item.ticker}</span>
                <span className="ticker-price">{formatCurrency(item.price)}</span>
                <span className="ticker-change" style={{ color }}>
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                </span>
              </span>
            );
          })}
          {tickerItems.map((item, i) => {
            const color = item.change >= 0 ? '#00CC66' : '#FF5555';
            return (
              <span key={`dup-${i}`} className="ticker-item">
                <span className="ticker-symbol">{item.ticker}</span>
                <span className="ticker-price">{formatCurrency(item.price)}</span>
                <span className="ticker-change" style={{ color }}>
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="widgets-grid">
        <div className="widget-card">
          <div className="card-content">
            <div className="label" style={{ color: '#C8B800' }}>PATRIMÔNIO</div>
            <div className="value">{formatCurrency(totals.patrimonio)}</div>
          </div>
          <div className="card-icon icon-pulse" style={{ fontSize: 36 }}>🏦</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">INVESTIDO</div>
            <div className="value">{formatCurrency(totals.investido)}</div>
          </div>
          <div className="card-icon icon-float" style={{ fontSize: 36 }}>💰</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">{totals.diferenca >= 0 ? 'LUCRO' : 'PERDA'}</div>
            <div className="value" style={{ color: totals.diferenca >= 0 ? '#00E676' : '#FF3D71' }}>
              {totals.diferenca >= 0 ? '' : '-'}{formatCurrency(Math.abs(totals.diferenca))}
            </div>
          </div>
          <div className="card-icon icon-pulse" style={{ fontSize: 36 }}>📈</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">RENDIMENTO</div>
            <div className="value" style={{ color: totals.diferenca >= 0 ? '#00E676' : '#FF3D71' }}>
              {totals.diferenca >= 0 ? '+' : ''}{formatNumber(totals.rendimentoPct)}%
            </div>
          </div>
          <div className="card-icon icon-float" style={{ fontSize: 36 }}>📊</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">DIVIDENDOS</div>
            <div className="value" style={{ color: dividendosMes > 0 ? '#00E676' : 'var(--text-faint)' }}>
              {formatCurrency(dividendosMes)}
            </div>
            <div className="change positive">Este mês</div>
          </div>
          <div className="card-icon icon-bounce" style={{ fontSize: 36 }}>💵</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">DIVIDENDOS</div>
            <div className="value" style={{ color: rendimentosAno > 0 ? '#00E676' : 'var(--text-faint)' }}>
              {formatCurrency(rendimentosAno)}
            </div>
            <div className="change positive">Ano atual</div>
          </div>
          <div className="card-icon icon-float" style={{ fontSize: 36 }}>📈</div>
        </div>

        <div className="widget-card">
          <div className="card-content">
            <div className="label">DIVIDENDOS</div>
            <div className="value" style={{ color: dividendosAcumulado > 0 ? '#00E676' : 'var(--text-faint)' }}>
              {formatCurrency(dividendosAcumulado)}
            </div>
            <div className="change positive">Acumulado</div>
          </div>
          <div className="card-icon icon-bounce" style={{ fontSize: 36 }}>💵</div>
        </div>
      </div>

      {sortedPortfolio.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, marginTop: 4 }}>
            <span style={{ fontSize: '0.65em', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-faint)', fontWeight: 600 }}>Portfólio</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
            <span style={{ fontSize: '0.65em', color: 'var(--text-faint)' }}>{sortedPortfolio.length} ativos</span>
          </div>
          <div className="asset-cards-grid">
            {sortedPortfolio.map((asset) => {
              const isProfit = asset.resultado >= 0;
              const tipoNorm = asset.tipo.replace(/Fii/g, 'FII');
              const accent = borderColors[tipoNorm] || 'var(--text-faint)';
              return (
                <div key={asset.ticker} className="asset-card" style={{ '--card-accent': accent }} onClick={() => setSelectedTicker(asset.ticker)}>
                  <div className="asset-card-bar"></div>
                  <div className="asset-card-left">
                    <LogoImage
                      ticker={asset.ticker}
                      fallback={typeIcons[asset.tipo] || '📄'}
                      size={46}
                      style={{ borderRadius: 10 }}
                    />
                    <div className="asset-card-cotas">
                      <span className="cotas-label">COTAS</span>
                      <span className="cotas-value">{formatNumber(asset.quantidade)}</span>
                    </div>
                  </div>

                  <div className="asset-card-info">
                    <div className="info-ticker">{asset.ticker}</div>
                    <div className="info-row">
                      <span className="info-label">Tipo</span>
                      <span className="info-value" style={{ color: accent, opacity: 0.9 }}>{asset.tipo.replace(/Fii/g, 'FII')}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Atual</span>
                      <span className="info-value">{formatCurrency(asset.atual)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{isProfit ? 'Lucro' : 'Perda'}</span>
                      <span className="info-value" style={{ color: isProfit ? '#00E676' : '#FF3D71', fontWeight: 700 }}>
                        {isProfit ? '+' : '-'}{formatCurrency(Math.abs(asset.resultado))}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">PM</span>
                      <span className="info-value">{formatCurrency(asset.precoMedio)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Hoje</span>
                      <span className="info-value">
                        {asset.cotacao != null ? formatCurrency(asset.cotacao) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                      </span>
                    </div>
                  </div>

                  <div className="asset-card-arrow" style={{ color: isProfit ? '#00E676' : '#FF3D71' }}>
                    {isProfit ? '▲' : '▼'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {assetModalInfo && (
        <div className={`asset-modal-overlay${closing ? ' closing' : ''}`} onClick={closeModal}>
          <div className={`asset-modal-content${closing ? ' closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="asset-modal-title">{assetModalInfo.ticker}</div>

            <div className="asset-modal-curtain">

            <div className="asset-modal-row">
              <span className="asset-modal-label">Quantidade total de ativos</span>
              <span className="asset-modal-value">{formatNumber(assetModalInfo.qtdTotal)}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Valor investido</span>
              <span className="asset-modal-value">{formatCurrency(assetModalInfo.investidoTotal)}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Valor atual</span>
              <span className="asset-modal-value">{formatCurrency(assetModalInfo.atualTotal)}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Valorização</span>
              <span className="asset-modal-value" style={{ color: assetModalInfo.valorizacaoPct >= 0 ? '#00E676' : '#FF3D71' }}>
                {assetModalInfo.valorizacaoPct >= 0 ? '+' : ''}{formatNumber(assetModalInfo.valorizacaoPct)}%
              </span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Primeira compra</span>
              <span className="asset-modal-value">{assetModalInfo.firstDate}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Última compra</span>
              <span className="asset-modal-value">{assetModalInfo.lastDate}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Maior preço</span>
              <span className="asset-modal-value">{assetModalInfo.maxPreco != null ? formatCurrency(assetModalInfo.maxPreco) : '—'}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Menor preço</span>
              <span className="asset-modal-value">{assetModalInfo.minPreco != null ? formatCurrency(assetModalInfo.minPreco) : '—'}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Maior dividendo por cota</span>
              <span className="asset-modal-value">{assetModalInfo.maxDiv != null ? formatCurrency(assetModalInfo.maxDiv) : '—'}</span>
            </div>
            <div className="asset-modal-row">
              <span className="asset-modal-label">Menor dividendo por cota</span>
              <span className="asset-modal-value">{assetModalInfo.minDiv != null ? formatCurrency(assetModalInfo.minDiv) : '—'}</span>
            </div>

            <button className="asset-modal-ok" onClick={closeModal}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Principal;
