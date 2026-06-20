import db from '../services/storage';

const STORAGE_NAME = 'ativos';

let cache = null;

export async function listar() {
  if (cache) return cache;
  const data = await db.read(STORAGE_NAME);
  cache = data || [];
  return cache;
}

export async function adicionar(ativo) {
  const lista = await listar();
  const sanitized = {
    TICKER: (ativo.TICKER || '').toUpperCase().trim(),
    NOME: ativo.NOME || '',
    CNPJ: ativo.CNPJ || '',
    TIPO: ativo.TIPO || '',
    SEGMENTO: ativo.SEGMENTO || '',
    IMAGEM: ativo.IMAGEM || '',
    LINK: ativo.LINK || ''
  };
  const existing = lista.findIndex(a => a.TICKER === sanitized.TICKER);
  if (existing !== -1) {
    lista[existing] = { ...lista[existing], ...sanitized };
  } else {
    lista.push(sanitized);
  }
  await db.write(STORAGE_NAME, lista);
  cache = lista;
  return sanitized;
}

export async function atualizar(ticker, dados) {
  const lista = await listar();
  const idx = lista.findIndex(a => a.TICKER === ticker);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...dados };
  await db.write(STORAGE_NAME, lista);
  cache = lista;
  return lista[idx];
}

export async function remover(ticker) {
  const lista = await listar();
  const novaLista = lista.filter(a => a.TICKER !== ticker);
  await db.write(STORAGE_NAME, novaLista);
  cache = novaLista;
  return true;
}

export async function buscarPorTicker(ticker) {
  const lista = await listar();
  return lista.find(a => a.TICKER === (ticker || '').toUpperCase().trim()) || null;
}

export async function buscarPorTipo(tipo) {
  const lista = await listar();
  return lista.filter(a => a.TIPO === tipo);
}

export async function buscarPorSegmento(segmento) {
  const lista = await listar();
  return lista.filter(a => a.SEGMENTO === segmento);
}

export async function buscarPorNome(nome) {
  const lista = await listar();
  const query = (nome || '').toLowerCase();
  return lista.filter(a => a.NOME.toLowerCase().includes(query));
}

export async function importarRegistros(ativos) {
  const lista = await listar();
  for (const ativo of ativos) {
    const ticker = (ativo.TICKER || '').toUpperCase().trim();
    if (!ticker) continue;
    const sanitized = {
      TICKER: ticker,
      NOME: ativo.NOME || '',
      CNPJ: ativo.CNPJ || '',
      TIPO: ativo.TIPO || '',
      SEGMENTO: ativo.SEGMENTO || '',
      IMAGEM: ativo.IMAGEM || '',
      LINK: ativo.LINK || ''
    };
    const existing = lista.findIndex(a => a.TICKER === ticker);
    if (existing !== -1) {
      lista[existing] = { ...lista[existing], ...sanitized };
    } else {
      lista.push(sanitized);
    }
  }
  await db.write(STORAGE_NAME, lista);
  cache = lista;
  return true;
}
