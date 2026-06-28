import { useState, useEffect, useRef } from 'react';
import db from '../services/storage';
import { buildRegistryFromTransactions } from '../services/tickerRegistry';
import { TransactionsContext } from './TransactionsContextDef';

export { TransactionsContext };

const STORAGE_NAME = 'transactions';

function getInitialData() {
  try {
    const stored = localStorage.getItem('investimento_transactions');
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data) && data.length > 0) return data;
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
        setTransactions(data);
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
    const newTx = { id: Date.now(), ...entry };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const updateTransaction = (id, data) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...data, id } : t)));
  };

  const removeTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  return (
    <TransactionsContext.Provider
      value={{ transactions, addTransaction, updateTransaction, removeTransaction, clearTransactions }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

// O hook useTransactions está em ./useTransactions.js — re-exportado aqui para
// manter compatibilidade com todos os arquivos que importam de TransactionsContext.
export { useTransactions } from './useTransactions';
