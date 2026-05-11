const STORAGE_KEY = 'investimento_ticker_registry';

const knownTickers = {
  PETR4: { nome: 'Petrobras PN', cnpj: '33.000.167/0001-01', tipo: 'Ação' },
  VALE3: { nome: 'Vale ON', cnpj: '33.592.510/0001-54', tipo: 'Ação' },
  ITUB4: { nome: 'Itaú Unibanco PN', cnpj: '60.872.504/0001-23', tipo: 'Ação' },
  ABEV3: { nome: 'Ambev ON', cnpj: '07.526.557/0001-00', tipo: 'Ação' },
  BBAS3: { nome: 'Banco do Brasil ON', cnpj: '00.000.000/0001-91', tipo: 'Ação' },
  WEGE3: { nome: 'WEG ON', cnpj: '84.429.695/0001-11', tipo: 'Ação' },
  HGLG11: { nome: 'CSHG Logística FII', cnpj: '10.287.354/0001-36', tipo: 'FII' },
  KNRI11: { nome: 'Kinea Renda Imobiliária FII', cnpj: '10.295.227/0001-09', tipo: 'FII' },
  MXRF11: { nome: 'Maxi Renda FII', cnpj: '11.061.557/0001-93', tipo: 'FII' },
  BTC: { nome: 'Bitcoin', cnpj: '', tipo: 'Cripto' },
  ETH: { nome: 'Ethereum', cnpj: '', tipo: 'Cripto' },
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...knownTickers, ...JSON.parse(raw) };
  } catch {}
  return { ...knownTickers };
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

let cache = null;

function getRegistry() {
  if (!cache) cache = load();
  return cache;
}

export function getTickerInfo(ticker) {
  const reg = getRegistry();
  return reg[ticker] || null;
}

export function saveTickerInfo(ticker, info) {
  const reg = getRegistry();
  reg[ticker] = info;
  cache = reg;
  save(reg);
}

export function buildRegistryFromTransactions(transactions) {
  const reg = getRegistry();
  let changed = false;
  transactions.forEach((t) => {
    if (t.ticker && !reg[t.ticker]) {
      reg[t.ticker] = { nome: t.ativo, cnpj: t.cnpj, tipo: t.tipo };
      changed = true;
    }
  });
  if (changed) {
    cache = reg;
    save(reg);
  }
}
