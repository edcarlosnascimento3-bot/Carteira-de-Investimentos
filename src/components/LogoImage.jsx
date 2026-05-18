import { useState, useEffect } from 'react';
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

let ativosCache = null;
let cachePromise = null;
function loadAtivos() {
  if (ativosCache) return Promise.resolve(ativosCache);
  if (cachePromise) return cachePromise;
  cachePromise = fetch('/api/db/ativos')
    .then(r => r.ok ? r.json() : [])
    .then(data => {
      const map = {};
      data.forEach(a => { if (a.TICKER) map[a.TICKER.toUpperCase()] = a.IMAGEM; });
      ativosCache = map;
      return map;
    })
    .catch(() => (ativosCache = {}));
  return cachePromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('ticker-logo-updated', (e) => {
    if (ativosCache && e.detail) {
      ativosCache[e.detail.ticker.toUpperCase()] = e.detail.url;
    }
  });
}

const customLogos = {};

function getLogoSources(ticker, imagemUrl) {
  if (!ticker) return [];
  const t = ticker.toUpperCase();
  const domain = domains[t];
  const sources = [];

  if (imagemUrl) {
    sources.push(imagemUrl);
  }

  if (domain) {
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    if (!sources.includes(clearbitUrl)) sources.push(clearbitUrl);
  }

  if (/[0-9]/.test(t)) {
    sources.push(`https://s3-symbol-logo.tradingview.com/brazil/${t}--big.svg`);
    sources.push(`https://statusinvest.com.br/img/company/avatar/${t.toLowerCase()}.jpeg`);
  }

  if (isCrypto(t)) {
    const lc = t.toLowerCase();
    sources.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${lc}.png`);
    if (cryptoNameMap[t]) {
      const name = cryptoNameMap[t];
      sources.push(`https://cryptologos.cc/logos/${name}-${lc}-logo.png?v=040`);
    }
  }

  if (domain) {
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  }

  return sources;
}

function LogoImage({ ticker, fallback, style, size }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const [imagemUrl, setImagemUrl] = useState(null);
  const s = size || 32;
  const bg = hashColor(ticker || '');

  useEffect(() => {
    if (!ticker) return;
    loadAtivos().then(map => {
      const url = map[ticker.toUpperCase()];
      setImagemUrl(url || null);
    });

    const handleUpdate = (e) => {
      if (e.detail && e.detail.ticker.toUpperCase() === ticker.toUpperCase()) {
        setImagemUrl(e.detail.url || null);
        setSrcIdx(0);
      }
    };

    window.addEventListener('ticker-logo-updated', handleUpdate);
    return () => {
      window.removeEventListener('ticker-logo-updated', handleUpdate);
    };
  }, [ticker]);

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: s,
    height: s,
    borderRadius: 8,
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...style,
  };

  if (!ticker) {
    return (
      <span style={{ ...containerStyle, background: bg, fontSize: s * 0.45, fontWeight: 700, color: '#FFFFFF' }}>
        {fallback || '?'}
      </span>
    );
  }

  const sources = getLogoSources(ticker, imagemUrl);

  if (srcIdx >= sources.length) {
    return (
      <span style={{ ...containerStyle, background: bg, fontSize: s * 0.45, fontWeight: 700, color: '#FFFFFF' }}>
        {fallback || ticker[0]}
      </span>
    );
  }

  return (
    <span style={containerStyle}>
      <img
        key={srcIdx}
        src={sources[srcIdx]}
        alt={ticker}
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setSrcIdx((i) => i + 1)}
      />
    </span>
  );
}

export default LogoImage;