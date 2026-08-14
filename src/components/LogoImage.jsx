import { useState, useEffect, useCallback } from 'react';
import dbAtivos from '../../db_ativos.json';

const indexMap = {};
let nextIdx = 1;
function hashColor(ticker) {
  if (!indexMap[ticker]) {
    const palette = ['#C8B800','#CC8800','#0099CC','#CC44CC','#00BB66','#FF5555','#3399FF','#FF8800','#66CC00','#9933FF'];
    indexMap[ticker] = palette[(nextIdx++) % palette.length];
  }
  return indexMap[ticker];
}

const ativosMap = (Array.isArray(dbAtivos) ? dbAtivos : []).reduce((map, a) => {
  if (a && a.TICKER) map[a.TICKER.toUpperCase()] = a.IMAGEM || '';
  return map;
}, {});

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
    setReady(false);
    setImagemUrl(ativosMap[ticker.toUpperCase()] || null);
    setReady(true);

    const handleUpdate = (e) => {
      if (e.detail && e.detail.ticker.toUpperCase() === ticker.toUpperCase()) {
        setImagemUrl(e.detail.url || null);
      }
    };

    window.addEventListener('ticker-logo-updated', handleUpdate);
    return () => window.removeEventListener('ticker-logo-updated', handleUpdate);
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
