import { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/storage';

const ProventosContext = createContext(null);

const STORAGE_NAME = 'proventos';

const initialData = [
  { id: 1, ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'Ação', data: '15/01/2026', ano: 2026, dividendos: 0, jcp: 350.00, rendimento: 0, reembolso: 0, observacao: 'JCP referente ao 3T25' },
  { id: 2, ticker: 'VALE3', nome: 'Vale ON', tipo: 'Ação', data: '20/02/2026', ano: 2026, dividendos: 420.50, jcp: 0, rendimento: 0, reembolso: 0, observacao: 'Dividendos' },
  { id: 3, ticker: 'HGLG11', nome: 'CSHG Logística FII', tipo: 'FII', data: '10/03/2026', ano: 2026, dividendos: 85.00, jcp: 0, rendimento: 0, reembolso: 0, observacao: '' },
  { id: 4, ticker: 'ITUB4', nome: 'Itaú Unibanco PN', tipo: 'Ação', data: '05/04/2026', ano: 2026, dividendos: 0, jcp: 0, rendimento: 120.00, reembolso: 0, observacao: '' },
  { id: 5, ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'Ação', data: '02/05/2026', ano: 2026, dividendos: 0, jcp: 0, rendimento: 0, reembolso: 50.00, observacao: 'Reembolso taxa' },
];

export function ProventosProvider({ children }) {
  const [proventos, setProventos] = useState(initialData);
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
    const newProv = { id: Date.now(), ...entry };
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
