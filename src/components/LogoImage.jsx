import { useState, useEffect, useCallback } from 'react';

const indexMap = {};
let nextIdx = 1;
function hashColor(ticker) {
  if (!indexMap[ticker]) {
    const palette = ['#C8B800','#CC8800','#0099CC','#CC44CC','#00BB66','#FF5555','#3399FF','#FF8800','#66CC00','#9933FF'];
    indexMap[ticker] = palette[(nextIdx++) % palette.length];
  }
  return indexMap[ticker];
}

let ativosCache = null;
let cachePromise = null;

function loadAtivos() {
  if (ativosCache) return Promise.resolve(ativosCache);
  if (cachePromise) return cachePromise;
  cachePromise = import('../database/TickerCatalogService').then(({ listar }) =>
    listar()
  ).then((data) => {
    const map = {};
    (data || []).forEach(a => {
      if (a && a.TICKER) map[a.TICKER.toUpperCase()] = a.IMAGEM || a.imagem || '';
    });
    // Lista vazia (ex.: chamada antes da sessão ficar pronta) não deve travar
    // o cache — permite nova tentativa na próxima montagem.
    if (Object.keys(map).length === 0) cachePromise = null;
    else ativosCache = map;
    return map;
  }).catch(() => {
    cachePromise = null;
    return {};
  });
  return cachePromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('ticker-logo-updated', (e) => {
    if (ativosCache && e.detail) {
      ativosCache[e.detail.ticker.toUpperCase()] = e.detail.url;
    }
  });
}

function LogoImage({ ticker, fallback, style, size }) {
  const [imagemUrl, setImagemUrl] = useState(null);
  const [ready, setReady] = useState(false);
  const s = size || 32;
  const bg = hashColor(ticker || '');

  const handleError = useCallback(() => {
    setImagemUrl(null);
  }, []);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setReady(false);
    loadAtivos().then(map => {
      if (cancelled) return;
      setImagemUrl(map[ticker.toUpperCase()] || null);
      setReady(true);
    });

    const handleUpdate = (e) => {
      if (e.detail && e.detail.ticker.toUpperCase() === ticker.toUpperCase()) {
        setImagemUrl(e.detail.url || null);
      }
    };

    window.addEventListener('ticker-logo-updated', handleUpdate);
    return () => {
      cancelled = true;
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

  if (!ready) {
    return <span style={containerStyle} />;
  }

  if (!imagemUrl) {
    return (
      <span style={{ ...containerStyle, background: bg, fontSize: s * 0.45, fontWeight: 700, color: '#FFFFFF' }}>
        {fallback || ticker[0]}
      </span>
    );
  }

  return (
    <span style={containerStyle}>
      <img
        src={imagemUrl}
        alt={ticker}
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={handleError}
      />
    </span>
  );
}

export default LogoImage;
