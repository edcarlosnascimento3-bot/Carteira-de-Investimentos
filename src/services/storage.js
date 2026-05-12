const db = {
  async read(name) {
    if (window.electronAPI?.db) {
      try {
        return await window.electronAPI.db.read(name);
      } catch {}
    }
    try {
      const raw = localStorage.getItem(`investimento_${name}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async write(name, data) {
    if (window.electronAPI?.db) {
      try {
        return await window.electronAPI.db.write(name, data);
      } catch {}
    }
    try {
      localStorage.setItem(`investimento_${name}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};

export default db;
