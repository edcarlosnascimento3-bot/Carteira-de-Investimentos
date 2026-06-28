import { supabase } from './supabaseClient';

const PLACEHOLDER_UUID = '00000000-0000-0000-0000-000000000000';
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

function lsKey(name, userId) {
  return userId ? `investimento_${userId}_${name}` : `investimento_${name}`;
}

function writeLocalStorage(name, data, userId) {
  try {
    localStorage.setItem(lsKey(name, userId), JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[storage] localStorage write falhou:', name, e);
    return false;
  }
}

function readLocalStorage(name, userId) {
  try {
    const raw = localStorage.getItem(lsKey(name, userId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[storage] localStorage read falhou:', name, e);
    return null;
  }
}

async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function readSupabase(name) {
  try {
    const userId = await getCurrentUserId();
    if (userId) {
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', name)
        .eq('user_id', userId)
        .single();
      if (!error && data?.value) return data.value;
    }

    const { data: legacy, error: legacyError } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', name)
      .eq('user_id', PLACEHOLDER_UUID)
      .single();

    if (!legacyError && legacy?.value) {
      if (userId) {
        await supabase.from('app_data')
          .update({ user_id: userId })
          .eq('key', name)
          .eq('user_id', PLACEHOLDER_UUID);
      }
      return legacy.value;
    }

    return null;
  } catch (e) {
    console.warn('[storage] Supabase read falhou:', name, e.message);
    return null;
  }
}

async function writeSupabase(name, data) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase
      .from('app_data')
      .upsert({ key: name, value: data, user_id: userId });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[storage] Supabase write falhou:', name, e.message);
    return false;
  }
}

const db = {
  async read(name) {
    const userId = await getCurrentUserId();
    const cached = readLocalStorage(name, userId);
    if (cached) return cached;

    const remote = await readSupabase(name);
    if (remote) {
      writeLocalStorage(name, remote, userId);
      return remote;
    }

    try {
      const idb = await idbRead(name);
      if (idb) {
        writeLocalStorage(name, idb, userId);
        return idb;
      }
    } catch (e) {
      console.warn('[storage] IndexedDB read falhou:', name, e);
    }

    return null;
  },

  async write(name, data) {
    const userId = await getCurrentUserId();
    writeLocalStorage(name, data, userId);

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
