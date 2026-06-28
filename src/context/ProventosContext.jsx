import { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/storage';

const ProventosContext = createContext(null);

const STORAGE_NAME = 'proventos';

function getInitialData() {
  try {
    const stored = localStorage.getItem('investimento_proventos');
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}
  return [];
}

let _proventoNextId = Date.now();

export function ProventosProvider({ children }) {
  const [proventos, setProventos] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.read(STORAGE_NAME).then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setProventos(data);
      }
      setLoaded(true);
    });
  }, []);

  // Failsafe beforeunload para garantir salvamento imediato síncrono no localStorage
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (loaded) {
        localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify(proventos));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [proventos, loaded]);

  const addProvento = (entry) => {
    const newProv = { id: ++_proventoNextId, ...entry };
    setProventos((prev) => {
      const next = [newProv, ...prev];
      localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify(next));
      db.write(STORAGE_NAME, next);
      return next;
    });
  };

  const updateProvento = (id, data) => {
    setProventos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...data, id } : t));
      localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify(next));
      db.write(STORAGE_NAME, next);
      return next;
    });
  };

  const removeProvento = (id) => {
    setProventos((prev) => {
      const next = prev.filter((t) => t.id !== id);
      localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify(next));
      db.write(STORAGE_NAME, next);
      return next;
    });
  };

  const clearProventos = () => {
    setProventos([]);
    localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify([]));
    db.write(STORAGE_NAME, []);
  };

  return (
    <ProventosContext.Provider
      value={{ proventos, addProvento, updateProvento, removeProvento, clearProventos }}
    >
      {children}
    </ProventosContext.Provider>
  );
}

export function useProventos() {
  const ctx = useContext(ProventosContext);
  if (!ctx) throw new Error('useProventos deve ser usado dentro de ProventosProvider');
  return ctx;
}
