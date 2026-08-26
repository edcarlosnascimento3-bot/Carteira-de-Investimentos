import { createContext, useContext, useState, useEffect, useRef } from 'react';
import db, { subscribeToChanges } from '../services/storage';
import { useAuth } from './AuthContext';
import { normalizeTipo, makeId } from '../utils/helpers';

const ProventosContext = createContext(null);

const STORAGE_NAME = 'proventos';

function normalizeProventos(list) {
  let changed = false;
  const next = list.map((p) => {
    if (p.tipo && typeof p.tipo === 'string' && p.tipo.match(/fii/i)) {
      changed = true;
      return { ...p, tipo: normalizeTipo(p.tipo) };
    }
    return p;
  });
  return changed ? next : list;
}

export function ProventosProvider({ children }) {
  const { user } = useAuth();
  const [proventos, setProventos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const proventosRef = useRef(proventos);

  useEffect(() => {
    proventosRef.current = proventos;
  }, [proventos]);

  // Carrega dados do Supabase (sempre remoto)
  useEffect(() => {
    if (!user) return;

    let active = true;
    db.readForce(STORAGE_NAME).then((data) => {
      if (!active) return;
      if (data && Array.isArray(data) && data.length > 0) {
        const normalized = normalizeProventos(data);
        if (normalized !== data) db.write(STORAGE_NAME, normalized);
        setProventos(normalized);
      } else {
        try {
          const legacy = localStorage.getItem('investimento_proventos');
          if (legacy) {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const normalized = normalizeProventos(parsed);
              if (normalized !== parsed) {
                localStorage.setItem('investimento_proventos', JSON.stringify(normalized));
              }
              setProventos(normalized);
              db.write(STORAGE_NAME, normalized);
            }
          }
        } catch {}
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [user]);

  // Realtime: recebe atualizações de outros dispositivos
  useEffect(() => {
    if (!user || !loaded) return;

    const unsub = subscribeToChanges(STORAGE_NAME, (remoteData) => {
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        const normalized = normalizeProventos(remoteData);
        const currentStr = JSON.stringify(proventosRef.current);
        const newStr = JSON.stringify(normalized);
        if (currentStr !== newStr) {
          setProventos(normalized);
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
          if (data && Array.isArray(data) && data.length > 0) {
            const normalized = normalizeProventos(data);
            const currentStr = JSON.stringify(proventosRef.current);
            const newStr = JSON.stringify(normalized);
            if (currentStr !== newStr) {
              setProventos(normalized);
            }
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [user, loaded]);

  // Salva local quando muda
  useEffect(() => {
    if (loaded && proventos.length > 0) {
      localStorage.setItem(`investimento_proventos`, JSON.stringify(proventos));
    }
  }, [proventos, loaded]);

  const addProvento = (entry) => {
    const newProv = { id: makeId(), ...entry, tipo: normalizeTipo(entry.tipo) };
    setProventos((prev) => {
      const next = [newProv, ...prev];
      db.write(STORAGE_NAME, next);
      return next;
    });
  };

  const updateProvento = (id, data) => {
    setProventos((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, ...data, id, tipo: normalizeTipo(data.tipo) } : t
      );
      db.write(STORAGE_NAME, next);
      return next;
    });
  };

  const removeProvento = (id) => {
    setProventos((prev) => {
      const next = prev.filter((t) => t.id !== id);
      db.write(STORAGE_NAME, next);
      return next;
    });
  };

  const clearProventos = () => {
    setProventos([]);
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
