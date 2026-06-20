import { useMemo, useState } from 'react';
import { formatCurrency, formatNumber } from '../services/format';
import { useTransactions } from '../context/TransactionsContext';
import { usePrices } from '../hooks/usePrices';
import LogoImage from '../components/LogoImage';

const defaultTickers = ['PETR4', 'VALE3', 'ITUB4', 'ABEV3', 'BBAS3', 'WEGE3', 'HGLG11', 'KNRI11', 'BTC', 'ETH'];

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
    
    return [...new Set([...defaultTickers, ...portfolioTickers])];
  }, [transactions]);

  const { prices, changes } = usePrices(tickers);

  const portfolio = useMemo(() => {
    let manualAtual = {};
    try { manualAtual = JSON.parse(localStorage.getItem('investimento_rf_manual')) || {}; } catch {}
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
      const isManual = ['Renda Fixa', 'Dólar', 'Euro'].includes(tipoNorm);
      const cotacao = isManual && manualAtual[g.ticker] != null
        ? manualAtual[g.ticker] / quantidade
        : tipoNorm === 'Renda Fixa'
          ? precoMedio
          : tipoNorm === 'Dólar'
            ? prices['USDBRL']
            : tipoNorm === 'Euro'
              ? prices['EURBRL']
              : prices[g.ticker];
      const atual = cotacao != null ? quantidade * cotacao : 0;
      const resultado = atual - investido;
      return { ...g, quantidade, investido, precoMedio, cotacao, atual, resultado };
    }).filter((g) => g.quantidade > 0);
  }, [transactions, prices]);

  const sortedPortfolio = useMemo(() => {
    return [...portfolio].sort((a, b) => b.atual - a.atual);
  }, [portfolio]);

  const totals = useMemo(() => {
    const patrimonio = portfolio.reduce((s, a) => s + a.atual, 0);
    const investido = portfolio.reduce((s, a) => s + a.investido, 0);
    const diferenca = patrimonio - investido;
    const rendimentoPct = investido > 0 ? (diferenca / investido) * 100 : 0;
    const totalTax = transactions.reduce((s, t) => s + t.taxa, 0);
    return { patrimonio, investido, diferenca, rendimentoPct, totalTax };
  }, [portfolio, transactions]);



  const formatNumber = (v) =>
    v.toLocaleString('pt-BR');

  const tickerItems = tickers.map((t) => ({
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
            <div className="label">DIVIDENDOS</div>
            <div className="value">R$ 320,40</div>
            <div className="change positive">último mês</div>
          </div>
          <div className="card-icon icon-bounce" style={{ fontSize: 36 }}>💵</div>
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

        <div className="widget-card" style={{
          background: 'linear-gradient(135deg, rgba(255,61,113,0.08) 0%, rgba(255,61,113,0.03) 100%)',
          borderColor: 'rgba(255,61,113,0.25)'
        }}>
          <div className="card-content">
            <div className="label" style={{ color: '#FF3D71' }}>TAXAS</div>
            <div className="value">{formatCurrency(totals.totalTax)}</div>
          </div>
          <div className="card-icon icon-bounce" style={{ fontSize: 36 }}>🧾</div>
        </div>
      </div>

      {sortedPortfolio.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, marginTop: 4 }}>
            <span style={{ fontSize: '0.65em', textTransform: 'uppercase', letterSpacing: '2px', color: '#555568', fontWeight: 600 }}>Portfólio</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
            <span style={{ fontSize: '0.65em', color: '#555568' }}>{sortedPortfolio.length} ativos</span>
          </div>
          <div className="asset-cards-grid">
            {sortedPortfolio.map((asset) => {
              const isProfit = asset.resultado >= 0;
              const tipoNorm = asset.tipo.replace(/Fii/g, 'FII');
              const accent = borderColors[tipoNorm] || '#555568';
              return (
                <div key={asset.ticker} className="asset-card" style={{ '--card-accent': accent }}>
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
                        {asset.cotacao != null ? formatCurrency(asset.cotacao) : <span style={{ color: '#333345' }}>—</span>}
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
    </div>
  );
}

export default Principal;
