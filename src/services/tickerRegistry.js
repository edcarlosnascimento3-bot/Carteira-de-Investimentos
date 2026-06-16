const STORAGE_KEY = 'investimento_ticker_registry';

let knownTickers = {};

let cache = null;
let ativosLoaded = false;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...knownTickers, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[tickerRegistry] load localStorage error:', e);
  }
  return { ...knownTickers };
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[tickerRegistry] save localStorage error:', e);
  }
}

function getRegistry() {
  if (!cache) cache = load();
  return cache;
}

export async function loadAtivosRegistry() {
  if (ativosLoaded) return;
  try {
    const res = await fetch('/api/db/ativos');
    if (!res.ok) {
      console.warn('[tickerRegistry] loadAtivosRegistry fetch status:', res.status);
      return;
    }
    const list = await res.json();
    const map = {};
    list.forEach(a => {
      if (!a.TICKER) return;
      const key = a.TICKER.toUpperCase().trim();
      map[key] = {
        nome: a.NOME || '',
        cnpj: a.CNPJ || '',
        tipo: a.TIPO || '',
        imagem: a.IMAGEM || '',
        link: a.LINK || ''
      };
    });
    knownTickers = map;
    cache = { ...map, ...load() };
    ativosLoaded = true;

    try {
      const tabelaRes = await fetch('/api/db/tabela_ativos');
      if (tabelaRes.ok) {
        const tabelaMap = await tabelaRes.json();
        if (tabelaMap && typeof tabelaMap === 'object') {
          Object.entries(tabelaMap).forEach(([ticker, url]) => {
            const key = ticker.toUpperCase().trim();
            if (knownTickers[key]) {
              if (!knownTickers[key].imagem && url) {
                knownTickers[key].imagem = url;
              }
            } else if (url) {
              knownTickers[key] = { nome: '', cnpj: '', tipo: '', imagem: url, link: '' };
            }
          });
          cache = { ...cache, ...knownTickers };
        }
      }
    } catch (e) {
      console.warn('[tickerRegistry] load tabela_ativos error:', e);
    }
  } catch (e) {
    console.warn('[tickerRegistry] loadAtivosRegistry error:', e);
  }
}

export function getTickerInfo(ticker) {
  const reg = getRegistry();
  const info = reg[ticker] || null;
  if (info) console.log(`[getTickerInfo] ${ticker}:`, JSON.stringify(info));
  else console.log(`[getTickerInfo] ${ticker}: NOT FOUND, keys:`, Object.keys(reg).slice(0,10));
  return info;
}

export async function saveTickerInfo(ticker, info) {
  const reg = getRegistry();
  const existing = reg[ticker];
  reg[ticker] = {
    nome: info.nome || existing?.nome || '',
    cnpj: info.cnpj || existing?.cnpj || '',
    tipo: info.tipo || existing?.tipo || '',
    imagem: info.imagem !== undefined ? info.imagem : existing?.imagem || '',
    link: info.link !== undefined ? info.link : existing?.link || '',
  };
  cache = reg;
  save(reg);

  const imagemUrl = reg[ticker].imagem;

  if (imagemUrl && info.imagem !== undefined) {
    try {
      const tabelaRes = await fetch('/api/db/tabela_ativos');
      let tabelaData = {};
      if (tabelaRes.ok) {
        tabelaData = await tabelaRes.json();
      }
      tabelaData[ticker.toUpperCase()] = imagemUrl;
      await fetch('/api/db/tabela_ativos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabelaData),
      });
    } catch (e) {
      console.warn('[tickerRegistry] save tabela_ativos error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ticker-logo-updated', {
      detail: { ticker: ticker.toUpperCase(), url: imagemUrl }
    }));
  }

  try {
    const res = await fetch('/api/db/ativos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        Array.from(
          new Map(
            Object.entries(cache).map(([t, v]) => [
              t,
              { TICKER: t, NOME: v.nome, CNPJ: v.cnpj || '', TIPO: v.tipo, SEGMENTO: '', IMAGEM: v.imagem || '', LINK: v.link || '' }
            ])
          ).values()
        )
      ),
    });
    if (!res.ok) {
      throw new Error(`Backend ${res.status}: ${res.statusText}`);
    }
  } catch (e) {
    console.warn('[tickerRegistry] saveTickerInfo fetch error:', e);
    throw e;
  }
}

export function buildRegistryFromTransactions(transactions) {
  const reg = getRegistry();
  let changed = false;
  transactions.forEach((t) => {
    if (!t.ticker) return;
    if (!reg[t.ticker]) {
      reg[t.ticker] = { nome: t.ativo, cnpj: t.cnpj, tipo: t.tipo };
      changed = true;
    } else {
      const entry = reg[t.ticker];
      if (!entry.cnpj && t.cnpj) { entry.cnpj = t.cnpj; changed = true; }
      if (!entry.nome && t.ativo) { entry.nome = t.ativo; changed = true; }
      if (!entry.tipo && t.tipo) { entry.tipo = t.tipo; changed = true; }
    }
  });
  if (changed) {
    cache = reg;
    save(reg);
  }
}
