import { useState, useEffect, useRef, useCallback } from 'react';
import db, { subscribeToChanges } from '../services/storage';
import { useAuth } from './AuthContext';
import { buildRegistryFromTransactions } from '../services/tickerRegistry';
import { TransactionsContext } from './TransactionsContextDef';
import { normalizeTipo, makeId } from '../utils/helpers';

export { TransactionsContext };

const STORAGE_NAME = 'transactions';

function dedupeIds(list) {
  const seen = new Set();
  let changed = false;
  const out = list.map((t) => {
    let id = t.id;
    if (id == null || seen.has(id)) {
      id = makeId();
      changed = true;
    }
    seen.add(id);
    return { ...t, id };
  });
  return changed ? out : list;
}

function normalizeTransactions(list) {
  let changed = false;
  const next = list.map((t) => {
    if (t.tipo && typeof t.tipo === 'string' && t.tipo.match(/fii/i)) {
      changed = true;
      return { ...t, tipo: normalizeTipo(t.tipo) };
    }
    return t;
  });
  return changed ? next : list;
}

function getInitialData() {
  try {
    const stored = localStorage.getItem('investimento_transactions');
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data) && data.length > 0) return dedupeIds(data);
    }
  } catch {}
  return [];
}

export function TransactionsProvider({ children }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Carrega dados do Supabase (sempre remoto)
  useEffect(() => {
    if (!user) return;

    let active = true;
    db.readForce(STORAGE_NAME).then((data) => {
      if (!active) return;
      if (data !== null && Array.isArray(data) && data.length > 0) {
        const normalized = normalizeTransactions(data);
        if (normalized !== data) {
          setTransactions(dedupeIds(normalized));
          db.write(STORAGE_NAME, dedupeIds(normalized));
        } else {
          setTransactions(dedupeIds(data));
        }
      }
      buildRegistryFromTransactions(data && Array.isArray(data) && data.length > 0 ? data : transactionsRef.current);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [user]);

  // Realtime: recebe atualizações de outros dispositivos
  useEffect(() => {
    if (!user || !loaded) return;

    const unsub = subscribeToChanges(STORAGE_NAME, (remoteData) => {
      if (Array.isArray(remoteData) && remoteData.length > 0) {
        const normalized = normalizeTransactions(remoteData);
        const deduped = dedupeIds(normalized);
        // Só atualiza se os dados realmente mudaram
        const currentStr = JSON.stringify(transactionsRef.current);
        const newStr = JSON.stringify(deduped);
        if (currentStr !== newStr) {
          setTransactions(deduped);
        }
      }
    });

    return unsub;
  }, [user, loaded]);

  // Refresh ao voltar à aba (visibilitychange)
  useEffect(() => {
    if (!user || !loaded) return;

    const handler = () => {
      if (document.visibilityState === 'visible') {
        db.readForce(STORAGE_NAME).then((data) => {
          if (data !== null && Array.isArray(data) && data.length > 0) {
            const normalized = normalizeTransactions(data);
            const deduped = dedupeIds(normalized);
            const currentStr = JSON.stringify(transactionsRef.current);
            const newStr = JSON.stringify(deduped);
            if (currentStr !== newStr) {
              setTransactions(deduped);
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
    localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify(transactions));
    db.write(STORAGE_NAME, transactions);
  }, [transactions, loaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (loaded) {
        localStorage.setItem(`investimento_${STORAGE_NAME}`, JSON.stringify(transactionsRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loaded]);

  const addTransaction = (entry) => {
    const newTx = { id: makeId(), ...entry, tipo: normalizeTipo(entry.tipo) };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const updateTransaction = (id, data) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, id, tipo: normalizeTipo(data.tipo) } : t))
    );
  };

  const removeTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  const replaceAllTransactions = (data) => {
    setTransactions(dedupeIds(Array.isArray(data) ? data : []));
  };

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, updateTransaction, removeTransaction, clearTransactions, replaceAllTransactions }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export { useTransactions } from './useTransactions';
