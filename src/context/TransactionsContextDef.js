import { createContext } from 'react';

// Contexto separado para evitar circular dependency e satisfazer o Fast Refresh do Vite.
export const TransactionsContext = createContext(null);
