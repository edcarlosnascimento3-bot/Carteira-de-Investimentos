import { createContext, useContext, useState, useEffect, useRef } from 'react';
import db, { subscribeToChanges } from '../services/storage';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [rfManual, setRfManual] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);
  const rfManualRef = useRef(rfManual);

  useEffect(() => {
    rfManualRef.current = rfManual;
  }, [rfManual]);

  // Carrega dados do Supabase (sempre remoto)
  useEffect(() => {
    if (!user) return;

    let active = true;
    db.readForce(STORAGE_NAME).then((data) => {
      if (!active) return;
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        setRfManual((prev) => {
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
        const currentStr = JSON.stringify(rfManualRef.current);
        const newStr = JSON.stringify(remoteData);
        if (currentStr !== newStr) {
          setRfManual(remoteData);
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
            const currentStr = JSON.stringify(rfManualRef.current);
            const newStr = JSON.stringify(data);
            if (currentStr !== newStr) {
              setRfManual(data);
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
