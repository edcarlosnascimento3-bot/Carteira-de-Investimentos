import { createContext, useContext } from 'react';
import { useStorageSync } from '../hooks/useStorageSync';

const RfManualContext = createContext(null);

const STORAGE_NAME = 'rf_manual';

function getInitialData() {
  try {
    const raw = localStorage.getItem('investimento_rf_manual');
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

export function RfManualProvider({ children }) {
  const { data: rfManual, setData: setRfManual } = useStorageSync(STORAGE_NAME, {
    initialValue: getInitialData,
    isEmpty: isEmptyObject,
    keepLocalIfPresent: true,
  });

  const updateRfManual = (updater) => {
    setRfManual((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  };

  return (
    <RfManualContext.Provider value={{ rfManual, updateRfManual }}>
      {children}
    </RfManualContext.Provider>
  );
}

export function useRfManual() {
  const ctx = useContext(RfManualContext);
  if (!ctx) throw new Error('useRfManual deve ser usado dentro de RfManualProvider');
  return ctx;
}
