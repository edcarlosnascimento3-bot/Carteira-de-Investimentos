import { useContext } from 'react';
import { TransactionsContext } from './TransactionsContextDef';

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions deve ser usado dentro de TransactionsProvider');
  return ctx;
}
