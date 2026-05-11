import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './context/UserContext';
import { TransactionsProvider } from './context/TransactionsContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <TransactionsProvider>
        <App />
      </TransactionsProvider>
    </UserProvider>
  </React.StrictMode>
);
