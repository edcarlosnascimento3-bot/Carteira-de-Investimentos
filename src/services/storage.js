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

const db = {
  async read(name) {
    if (window.electronAPI?.db) {
      try {
        return await window.electronAPI.db.read(name);
      } catch {}
    }
    
    // Tenta ler do arquivo local (via Vite dev server plugin)
    try {
      const res = await fetch(`/api/db/${name}`);
      if (res.ok) {
        const data = await res.json();
        // Sincroniza com IndexedDB para backup
        this.write(name, data, true);
        return data;
      }
    } catch {}

    // Fallback: IndexedDB
    try {
      const conn = await openDB();
      return new Promise((resolve, reject) => {
        const tx = conn.transaction('data', 'readonly');
        const store = tx.objectStore('data');
        const req = store.get(name);
        req.onsuccess = () => {
          resolve(req.result ? req.result.data : null);
          conn.close();
        };
        req.onerror = () => {
          reject(req.error);
          conn.close();
        };
      });
    } catch {}
    
    // Fallback final: LocalStorage
    try {
      const raw = localStorage.getItem(`investimento_${name}`);
      if (raw) {
        const data = JSON.parse(raw);
        return data;
      }
      return null;
    } catch {
      return null;
    }
  },

  async write(name, data, skipFileWrite = false) {
    if (window.electronAPI?.db) {
      try {
        return await window.electronAPI.db.write(name, data);
      } catch {}
    }

    // Salva no arquivo local para persistência real no diretório do projeto
    if (!skipFileWrite) {
      try {
        fetch(`/api/db/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
      } catch {}
    }

    // Backup no IndexedDB
    try {
      const conn = await openDB();
      return new Promise((resolve, reject) => {
        const tx = conn.transaction('data', 'readwrite');
        const store = tx.objectStore('data');
        store.put({ name, data });
        tx.oncomplete = () => {
          resolve(true);
          conn.close();
        };
        tx.onerror = () => {
          reject(tx.error);
          conn.close();
        };
      });
    } catch {}
    
    // Backup no LocalStorage
    try {
      localStorage.setItem(`investimento_${name}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};

export default db;
