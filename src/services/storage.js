import { supabase } from './supabaseClient';

const DB_NAME = 'InvestmentDB';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data', { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbWrite(name, data) {
  const conn = await openDB();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction('data', 'readwrite');
    tx.objectStore('data').put({ name, data });
    tx.oncomplete = () => { resolve(true); conn.close(); };
    tx.onerror = () => { reject(tx.error); conn.close(); };
  });
}

async function idbRead(name) {
  const conn = await openDB();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction('data', 'readonly');
    const store = tx.objectStore('data');
    const req = store.get(name);
    req.onsuccess = () => { resolve(req.result ? req.result.data : null); conn.close(); };
    req.onerror = () => { reject(req.error); conn.close(); };
  });
}

function writeLocalStorage(name, data) {
  try {
    localStorage.setItem(`investimento_${name}`, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[storage] localStorage write falhou:', name, e);
    return false;
  }
}

function readLocalStorage(name) {
  try {
    const raw = localStorage.getItem(`investimento_${name}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[storage] localStorage read falhou:', name, e);
    return null;
  }
}

async function readSupabase(name) {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', name)
      .single();
    if (error) throw error;
    return data?.value ?? null;
  } catch (e) {
    console.warn('[storage] Supabase read falhou:', name, e.message);
    return null;
  }
}

async function writeSupabase(name, data) {
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ key: name, value: data });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[storage] Supabase write falhou:', name, e.message);
    return false;
  }
}

const db = {
  async read(name) {
    const cached = readLocalStorage(name);
    if (cached) return cached;

    const remote = await readSupabase(name);
    if (remote) {
      writeLocalStorage(name, remote);
      return remote;
    }

    try {
      const idb = await idbRead(name);
      if (idb) {
        writeLocalStorage(name, idb);
        return idb;
      }
    } catch (e) {
      console.warn('[storage] IndexedDB read falhou:', name, e);
    }

    return null;
  },

  async write(name, data) {
    writeLocalStorage(name, data);

    await writeSupabase(name, data);

    try {
      await idbWrite(name, data);
    } catch (e) {
      console.warn('[storage] IndexedDB write falhou:', name, e);
    }

    return true;
  },
};

export default db;
