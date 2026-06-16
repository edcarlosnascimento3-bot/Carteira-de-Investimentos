import db from '../services/storage';

const STORAGE_NAME = 'corretoras';

let corretorasCache = null;

export async function listar() {
  if (corretorasCache) return corretorasCache;
  const data = await db.read(STORAGE_NAME);
  corretorasCache = data || [];
  return corretorasCache;
}

export async function adicionar(corretora) {
  const lista = await listar();
  const maxId = lista.length > 0 ? Math.max(...lista.map(c => c.id)) : 0;
  const nova = { id: maxId + 1, nome: corretora.nome, logo_url: corretora.logo_url || '' };
  lista.push(nova);
  await db.write(STORAGE_NAME, lista);
  corretorasCache = lista;
  return nova;
}

export async function atualizar(id, dados) {
  const lista = await listar();
  const idx = lista.findIndex(c => c.id === id);
  if (idx === -1) return null;
  lista[idx] = { ...lista[idx], ...dados };
  await db.write(STORAGE_NAME, lista);
  corretorasCache = lista;
  return lista[idx];
}

export async function remover(id) {
  const lista = await listar();
  const novaLista = lista.filter(c => c.id !== id);
  await db.write(STORAGE_NAME, novaLista);
  corretorasCache = novaLista;
  return true;
}

export async function buscarPorId(id) {
  const lista = await listar();
  return lista.find(c => c.id === id) || null;
}

export async function buscarPorNome(nome) {
  const lista = await listar();
  return lista.find(c => c.nome.toLowerCase() === nome.toLowerCase()) || null;
}
