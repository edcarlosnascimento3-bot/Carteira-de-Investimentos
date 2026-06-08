import { createContext, useContext, useState, useEffect, useRef } from 'react';
import db from '../services/storage';

const TransactionsContext = createContext(null);

const STORAGE_NAME = 'transactions';

const initialData = [
  {
    id: 1, imagem: null, ticker: 'PETR4', ativo: 'Petrobras PN',
    cnpj: '33.000.167/0001-01', tipo: 'Ação', segmento: 'Óleo e Gás',
    operacao: 'Compra', data: '02/01/2026', ano: 2026,
    quantidade: 200, valor: 35.12, taxa: 19.90, investido: 7043.90, patrimonio: 7684.00,
  },
  {
    id: 2, imagem: null, ticker: 'VALE3', ativo: 'Vale ON',
    cnpj: '33.592.510/0001-54', tipo: 'Ação', segmento: 'Mineração',
    operacao: 'Compra', data: '15/01/2026', ano: 2026,
    quantidade: 100, valor: 62.80, taxa: 9.90, investido: 6289.90, patrimonio: 6815.00,
  },
  {
    id: 3, imagem: null, ticker: 'HGLG11', ativo: 'CSHG Logística FII',
    cnpj: '10.287.354/0001-36', tipo: 'FII', segmento: 'Logística',
    operacao: 'Compra', data: '20/02/2026', ano: 2026,
    quantidade: 50, valor: 172.50, taxa: 0, investido: 8625.00, patrimonio: 8940.00,
  },
  {
    id: 4, imagem: null, ticker: 'ITUB4', ativo: 'Itaú Unibanco PN',
    cnpj: '60.872.504/0001-23', tipo: 'Ação', segmento: 'Financeiro',
    operacao: 'Compra', data: '05/03/2026', ano: 2026,
    quantidade: 150, valor: 32.40, taxa: 14.90, investido: 4874.90, patrimonio: 4864.50,
  },
  {
    id: 5, imagem: null, ticker: 'PETR4', ativo: 'Petrobras PN',
    cnpj: '33.000.167/0001-01', tipo: 'Ação', segmento: 'Óleo e Gás',
    operacao: 'Venda', data: '10/04/2026', ano: 2026,
    quantidade: 50, valor: 38.42, taxa: 9.90, investido: 1911.10, patrimonio: 1921.00,
  },
];

export function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState(initialData);
  const [loaded, setLoaded] = useState(false);
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    db.read(STORAGE_NAME).then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setTransactions(data);
      }
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

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions deve ser usado dentro de TransactionsProvider');
  return ctx;
}
