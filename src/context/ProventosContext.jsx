import { createContext, useContext } from 'react';
import { normalizeTipo, makeId } from '../utils/helpers';
import { useStorageSync } from '../hooks/useStorageSync';

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

function isEmptyProventos(value) {
  return !Array.isArray(value) || value.length === 0;
}

export function ProventosProvider({ children }) {
  const { data: proventos, setData: setProventos } = useStorageSync(STORAGE_NAME, {
    initialValue: [],
    normalize: normalizeProventos,
    isEmpty: isEmptyProventos,
    fallbackLocalStorage: true,
  });

  const addProvento = (entry) => {
    const newProv = { id: makeId(), ...entry, tipo: normalizeTipo(entry.tipo) };
    setProventos((prev) => [newProv, ...prev]);
  };

  const updateProvento = (id, data) => {
    setProventos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...data, id, tipo: normalizeTipo(data.tipo) } : t
      )
    );
  };

  const removeProvento = (id) => {
    setProventos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearProventos = () => {
    setProventos([]);
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
