import { createContext, useContext, useState, useEffect, useRef } from 'react';
import db from '../services/storage';
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

  useEffect(() => {
    if (!user) return;

    let active = true;
    db.read(STORAGE_NAME).then((data) => {
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
