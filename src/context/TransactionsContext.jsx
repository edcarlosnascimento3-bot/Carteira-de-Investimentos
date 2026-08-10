import { useState, useEffect, useRef } from 'react';
import db from '../services/storage';
import { buildRegistryFromTransactions } from '../services/tickerRegistry';
import { TransactionsContext } from './TransactionsContextDef';

export { TransactionsContext };

const STORAGE_NAME = 'transactions';

// Id único: randomUUID (navegadores modernos) com fallback para timestamp + aleatório.
// Nunca usar apenas Date.now() — importações em massa criam ids duplicados no mesmo ms.
function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Corrige ids duplicados/nulos reatribuindo ids únicos (migração de dados legados).
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

function normalizeTipo(tipo) {
  if (typeof tipo !== 'string') return tipo;
  return tipo.replace(/fii/gi, 'FII');
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
  const [transactions, setTransactions] = useState(getInitialData);
  const [loaded, setLoaded] = useState(false);
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    db.read(STORAGE_NAME).then((data) => {
      if (data !== null && Array.isArray(data) && data.length > 0) {
        const normalized = normalizeTransactions(data);
        if (normalized !== data) {
          setTransactions(dedupeIds(normalized));
          db.write(STORAGE_NAME, dedupeIds(normalized));
        } else {
          setTransactions(dedupeIds(data));
        }
      }
      buildRegistryFromTransactions(data && Array.isArray(data) && data.length > 0 ? data : transactions);
      setLoaded(true);
    });
  }, []);

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

// O hook useTransactions está em ./useTransactions.js — re-exportado aqui para
// manter compatibilidade com todos os arquivos que importam de TransactionsContext.
export { useTransactions } from './useTransactions';
