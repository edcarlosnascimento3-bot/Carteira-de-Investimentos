import { listar as listarAtivos, atualizar as atualizarAtivo, adicionar as adicionarAtivo } from '../database/TickerCatalogService';

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
    const list = await listarAtivos();
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ticker-logo-updated', {
      detail: { ticker: ticker.toUpperCase(), url: reg[ticker].imagem }
    }));
  }

  try {
    const info = reg[ticker];
    const updated = await atualizarAtivo(ticker, info);
    if (!updated) {
      await adicionarAtivo({
        TICKER: ticker,
        NOME: info.nome || '',
        CNPJ: info.cnpj || '',
        TIPO: info.tipo || '',
        IMAGEM: info.imagem || '',
        LINK: info.link || ''
      });
      syncToServerJson(ticker, info);
    }
  } catch (e) {
    console.warn('[tickerRegistry] saveTickerInfo error:', e);
    throw e;
  }
}

async function syncToServerJson(ticker, info) {
  try {
    const res = await fetch('/api/db/ativos');
    const data = await res.json();
    data.push({
      TICKER: ticker,
      NOME: info.nome || '',
      CNPJ: info.cnpj || '',
      TIPO: info.tipo || '',
      IMAGEM: info.imagem || '',
      LINK: info.link || ''
    });
    await fetch('/api/db/ativos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log(`[tickerRegistry] synced ${ticker} to db_ativos.json`);
  } catch (e) {
    console.warn('[tickerRegistry] syncToServerJson error:', e);
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
