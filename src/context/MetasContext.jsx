import { createContext, useContext } from 'react';
import { useStorageSync } from '../hooks/useStorageSync';

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

function isEmptyObject(value) {
  return !value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0;
}

export function MetasProvider({ children }) {
  const { data: metas, setData: setMetas } = useStorageSync(STORAGE_NAME, {
    initialValue: getInitialData,
    isEmpty: isEmptyObject,
    keepLocalIfPresent: true,
  });

  const updateMetas = (updater) => {
    setMetas((prev) => (typeof updater === 'function' ? updater(prev) : updater));
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
