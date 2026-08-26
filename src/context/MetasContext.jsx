import { createContext, useContext, useState, useEffect, useRef } from 'react';
import db, { subscribeToChanges } from '../services/storage';
import { useAuth } from './AuthContext';

const MetasContext = createContext(null);

const STORAGE_NAME = 'metas';

function getInitialData() {
  try {
    const raw = localStorage.getItem('investimento_metas');
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && Object.keys(data).length > 0) return data;
    }
  } catch {}
  return {};
}

export function MetasProvider({ children }) {
  const { user } = useAuth();
  const [metas, setMetas] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);
  const metasRef = useRef(metas);

  useEffect(() => {
    metasRef.current = metas;
  }, [metas]);

  // Carrega dados do Supabase (sempre remoto)
  useEffect(() => {
    if (!user) return;

    let active = true;
    db.readForce(STORAGE_NAME).then((data) => {
      if (!active) return;
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        setMetas((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return data;
        });
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [user]);

  // Realtime: recebe atualizações de outros dispositivos
  useEffect(() => {
    if (!user || !loaded) return;

    const unsub = subscribeToChanges(STORAGE_NAME, (remoteData) => {
      if (remoteData && typeof remoteData === 'object' && Object.keys(remoteData).length > 0) {
        const currentStr = JSON.stringify(metasRef.current);
        const newStr = JSON.stringify(remoteData);
        if (currentStr !== newStr) {
          setMetas(remoteData);
        }
      }
    });

    return unsub;
  }, [user, loaded]);

  // Refresh ao voltar à aba
  useEffect(() => {
    if (!user || !loaded) return;

    const handler = () => {
      if (document.visibilityState === 'visible') {
        db.readForce(STORAGE_NAME).then((data) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const currentStr = JSON.stringify(metasRef.current);
            const newStr = JSON.stringify(data);
            if (currentStr !== newStr) {
              setMetas(data);
            }
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user, loaded]);

  // Salva local + Supabase quando muda
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('investimento_metas', JSON.stringify(metas));
    db.write(STORAGE_NAME, metas);
  }, [metas, loaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (loaded) {
        localStorage.setItem('investimento_metas', JSON.stringify(metasRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loaded]);

  const updateMetas = (updater) => {
    setMetas((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  return (
    <MetasContext.Provider value={{ metas, updateMetas }}>
      {children}
    </MetasContext.Provider>
  );
}

export function useMetas() {
  const ctx = useContext(MetasContext);
  if (!ctx) throw new Error('useMetas deve ser usado dentro de MetasProvider');
  return ctx;
}
