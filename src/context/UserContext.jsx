import { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/storage';

const UserContext = createContext(null);

const STORAGE_NAME = 'user';
const AVATAR_IDB_KEY = 'investimento_user_avatar';

function getInitialName() {
  try {
    const stored = localStorage.getItem('investimento_user');
    if (stored) {
      const data = JSON.parse(stored);
      if (data?.userName) return data.userName;
    }
  } catch {}
  return '';
}

export function UserProvider({ children }) {
  const [userName, setUserName] = useState(getInitialName);
  const [avatar, setAvatar] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Carrega userName do storage principal
    db.read(STORAGE_NAME).then((data) => {
      if (data?.userName) setUserName(data.userName);
    });
    // Carrega avatar do IndexedDB separadamente para evitar QuotaExceededError
    loadAvatarFromIDB().then((saved) => {
      if (saved) setAvatar(saved);
      setLoaded(true);
    });
  }, []);

  // Persiste apenas o userName (sem o base64 do avatar que é muito grande)
  useEffect(() => {
    if (loaded) db.write(STORAGE_NAME, { userName });
  }, [userName, loaded]);

  // Persiste o avatar diretamente no IndexedDB ao trocar
  useEffect(() => {
    if (loaded) saveAvatarToIDB(avatar);
  }, [avatar, loaded]);

  return (
    <UserContext.Provider value={{ userName, setUserName, avatar, setAvatar }}>
      {children}
    </UserContext.Provider>
  );
}

// ─── Helpers IndexedDB para avatar ────────────────────────────────────────

function openAvatarDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('InvestmentDB', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('data')) d.createObjectStore('data', { keyPath: 'name' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveAvatarToIDB(dataUrl) {
  try {
    const conn = await openAvatarDB();
    await new Promise((resolve, reject) => {
      const tx = conn.transaction('data', 'readwrite');
      tx.objectStore('data').put({ name: AVATAR_IDB_KEY, data: dataUrl ?? null });
      tx.oncomplete = () => { resolve(); conn.close(); };
      tx.onerror = () => { reject(); conn.close(); };
    });
  } catch { /* silencioso */ }
}

async function loadAvatarFromIDB() {
  try {
    const conn = await openAvatarDB();
    return new Promise((resolve) => {
      const tx = conn.transaction('data', 'readonly');
      const req = tx.objectStore('data').get(AVATAR_IDB_KEY);
      req.onsuccess = () => { resolve(req.result?.data ?? null); conn.close(); };
      req.onerror = () => { resolve(null); conn.close(); };
    });
  } catch { return null; }
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser deve ser usado dentro de UserProvider');
  return ctx;
}

