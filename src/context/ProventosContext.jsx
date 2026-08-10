import { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/storage';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const ProventosContext = createContext(null);

const STORAGE_NAME = 'proventos';

let _proventoNextId = Date.now();

function normalizeTipo(tipo) {
  if (typeof tipo !== 'string') return tipo;
  return tipo.replace(/fii/gi, 'FII');
}

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

  useEffect(() => {
    if (!user) return;

    db.read(STORAGE_NAME).then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const normalized = normalizeProventos(data);
        if (normalized !== data) db.write(STORAGE_NAME, normalized);
        setProventos(normalized);
      } else {
        // fallback: tentar carregar do localStorage legacy (antes do escopo por user_id)
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
  }, [user]);

  useEffect(() => {
    if (loaded && proventos.length > 0) {
      localStorage.setItem(`investimento_proventos`, JSON.stringify(proventos));
    }
  }, [proventos, loaded]);

  const addProvento = (entry) => {
    const newProv = { id: ++_proventoNextId, ...entry, tipo: normalizeTipo(entry.tipo) };
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
