import { useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { buildRegistryFromTransactions } from '../services/tickerRegistry';
import { TransactionsContext } from './TransactionsContextDef';
import { normalizeTipo, makeId } from '../utils/helpers';
import { useStorageSync } from '../hooks/useStorageSync';

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

function normalizeAndDedupe(list) {
  return dedupeIds(normalizeTransactions(list));
}

function isEmptyTransactions(value) {
  return !Array.isArray(value) || value.length === 0;
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
  const { data: transactions, setData: setTransactions } = useStorageSync(STORAGE_NAME, {
    initialValue: getInitialData,
    normalize: normalizeAndDedupe,
    isEmpty: isEmptyTransactions,
  });
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    if (!user) return;

    buildRegistryFromTransactions(transactionsRef.current);
  }, [user, transactions]);

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
