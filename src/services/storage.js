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

async function writeElectron(name, data) {
  if (!window.electronAPI?.db) return false;
  try {
    return await window.electronAPI.db.write(name, data);
  } catch (e) {
    console.warn('[storage] Electron write falhou:', name, e);
    return false;
  }
}

async function readElectron(name) {
  if (!window.electronAPI?.db) return null;
  try {
    return await window.electronAPI.db.read(name);
  } catch (e) {
    console.warn('[storage] Electron read falhou:', name, e);
    return null;
  }
}

async function writeVite(name, data) {
  try {
    const res = await fetch(`/api/db/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) console.warn('[storage] Vite write status:', res.status, name);
    return res.ok;
  } catch (e) {
    console.warn('[storage] Vite write fetch falhou:', name, e);
    return false;
  }
}

async function readVite(name) {
  try {
    const res = await fetch(`/api/db/${name}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
    return null;
  } catch (e) {
    console.warn('[storage] Vite read fetch falhou:', name, e);
    return null;
  }
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

const db = {
  async read(name) {
    // 1. localStorage (mais recente, salvo sempre que algo muda)
    const ls = readLocalStorage(name);
    if (ls) return ls;

    // 2. Electron IPC
    const electron = await readElectron(name);
    if (electron) {
      writeLocalStorage(name, electron);
      return electron;
    }

    // 3. Vite / arquivo local
    const vite = await readVite(name);
    if (vite) {
      writeLocalStorage(name, vite);
      return vite;
    }

    // 4. IndexedDB (backup)
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

  async write(name, data, skipFileWrite = false) {
    const errors = [];

    // 1. localStorage (sempre, mais rápido e cache principal)
    writeLocalStorage(name, data);

    // 2. Electron IPC
    await writeElectron(name, data);

    // 3. Vite / arquivo local
    if (!skipFileWrite) {
      await writeVite(name, data);
    }

    // 4. IndexedDB (backup)
    try {
      await idbWrite(name, data);
    } catch (e) {
      console.warn('[storage] IndexedDB write falhou:', name, e);
      errors.push(e);
    }

    return errors.length === 0;
  },
};

export default db;
