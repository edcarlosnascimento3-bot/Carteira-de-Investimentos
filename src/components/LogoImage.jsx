import { useState } from 'react';
import domains from '../data/companyDomains';

const indexMap = {};
let nextIdx = 1;
function hashColor(ticker) {
  if (!indexMap[ticker]) {
    const palette = ['#C8B800','#CC8800','#0099CC','#CC44CC','#00BB66','#FF5555','#3399FF','#FF8800','#66CC00','#9933FF'];
    indexMap[ticker] = palette[(nextIdx++) % palette.length];
  }
  return indexMap[ticker];
}

const cryptoNameMap = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano',
  XRP: 'xrp', DOGE: 'dogecoin', DOT: 'polkadot', MATIC: 'polygon',
  AVAX: 'avalanche', LINK: 'chainlink', UNI: 'uniswap', ATOM: 'cosmos',
};

function isCrypto(t) {
  return !/[0-9]/.test(t) && t === t.toUpperCase() && t.length <= 5;
}

function getLogoSources(ticker) {
  if (!ticker) return [];
  const t = ticker.toUpperCase();
  const domain = domains[t];
  const sources = [];

  if (domain) {
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  }

  if (/[0-9]/.test(t)) {
    sources.push(`https://s3-symbol-logo.tradingview.com/${t}.SA.svg`);
    sources.push(`https://s3-symbol-logo.tradingview.com/${t}.SVG`);
    sources.push(`https://www.statusinvest.com.br/assets/img/logo/${t}.png`);
    sources.push(`https://statusinvest.com.br/assets/img/logo/${t}.svg`);
  }

  if (isCrypto(t)) {
    const lc = t.toLowerCase();
    sources.push(`https://cryptoicons.org/api/icon/${lc}/200`);
    if (cryptoNameMap[t]) {
      const name = cryptoNameMap[t];
      sources.push(`https://cryptologos.cc/logos/${name}-${lc}-logo.png`);
      sources.push(`https://cryptologos.cc/logos/${name}-${lc}-logo.svg`);
    }
  }

  return sources;
}

function LogoImage({ ticker, fallback, style, size }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const s = size || 32;
  const bg = hashColor(ticker || '');

  if (!ticker) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: s, height: s, borderRadius: 8, background: bg, fontSize: s * 0.45,
        fontWeight: 700, color: '#FFFFFF', flexShrink: 0, ...style,
      }}>
        {fallback || '?'}
      </span>
    );
  }

  const sources = getLogoSources(ticker);

  if (srcIdx >= sources.length) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: s, height: s, borderRadius: 8, background: bg, fontSize: s * 0.45,
        fontWeight: 700, color: '#FFFFFF', flexShrink: 0, ...style,
      }}>
        {fallback || ticker[0]}
      </span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: s, height: s, borderRadius: 8, background: bg, flexShrink: 0,
      position: 'relative', overflow: 'hidden', ...style,
    }}>
      <img
        key={srcIdx}
        src={sources[srcIdx]}
        alt={ticker}
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }}
        onError={() => setSrcIdx((i) => i + 1)}
      />
    </span>
  );
}

export default LogoImage;
