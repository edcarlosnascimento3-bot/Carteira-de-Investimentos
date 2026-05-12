import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './context/UserContext';
import { TransactionsProvider } from './context/TransactionsContext';
import { ProventosProvider } from './context/ProventosContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <TransactionsProvider>
        <ProventosProvider>
          <App />
        </ProventosProvider>
      </TransactionsProvider>
    </UserProvider>
  </React.StrictMode>
);
