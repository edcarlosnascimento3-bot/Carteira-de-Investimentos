import { createContext, useContext, useState, useEffect, useRef } from 'react';
import db from '../services/storage';

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

export function RfManualProvider({ children }) {
  const [rfManual, setRfManual] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);
  const rfManualRef = useRef(rfManual);

  useEffect(() => {
    rfManualRef.current = rfManual;
  }, [rfManual]);

  useEffect(() => {
    db.read(STORAGE_NAME).then((data) => {
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        setRfManual((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          return data;
        });
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem('investimento_rf_manual', JSON.stringify(rfManual));
    db.write(STORAGE_NAME, rfManual);
  }, [rfManual, loaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (loaded) {
        localStorage.setItem('investimento_rf_manual', JSON.stringify(rfManualRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loaded]);

  const updateRfManual = (updater) => {
    setRfManual((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
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
