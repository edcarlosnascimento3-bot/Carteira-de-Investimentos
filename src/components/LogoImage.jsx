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

const customLogos = {
  BBAS3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Banco_do_Brasil_logo_2015.svg/512px-Banco_do_Brasil_logo_2015.svg.png',
  TAEE3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Taesa_logo.svg/512px-Taesa_logo.svg.png',
  TAEE4: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Taesa_logo.svg/512px-Taesa_logo.svg.png',
  TAEE11: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Taesa_logo.svg/512px-Taesa_logo.svg.png',
  ITSA3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Itausa_logo.svg/512px-Itausa_logo.svg.png',
  ITSA4: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Itausa_logo.svg/512px-Itausa_logo.svg.png',
  ITUB3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Itau_logo.svg/512px-Itau_logo.svg.png',
  ITUB4: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Itau_logo.svg/512px-Itau_logo.svg.png',
};

function getLogoSources(ticker) {
  if (!ticker) return [];
  const t = ticker.toUpperCase();
  const domain = domains[t];
  const sources = [];

  if (customLogos[t]) {
    sources.push(customLogos[t]);
  }

  if (domain) {
    // Clearbit fornece logos grandes e de alta qualidade (melhor opção)
    sources.push(`https://logo.clearbit.com/${domain}`);
    // Google Favicons como fallback seguro (tamanho 128px para não ficar borrado)
    sources.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    // DuckDuckGo como último recurso
    sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
  }

  if (/[0-9]/.test(t)) {
    // Fallbacks para B3 caso não tenha domínio mapeado
    // Tenta carregar do statusinvest (pode ter proteção, mas vale a pena tentar)
    sources.push(`https://statusinvest.com.br/img/company/avatar/${t.toLowerCase()}.jpeg`);
    sources.push(`https://statusinvest.com.br/assets/img/logo/${t.toLowerCase()}.svg`);
    // Fallback TradingView
    sources.push(`https://s3-symbol-logo.tradingview.com/${t}.SA.svg`);
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
