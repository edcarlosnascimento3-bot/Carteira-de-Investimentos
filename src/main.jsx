import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserProvider } from './context/UserContext';
import { TransactionsProvider } from './context/TransactionsContext';
import { ProventosProvider } from './context/ProventosContext';
import { AuthProvider } from './context/AuthContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <UserProvider>
        <TransactionsProvider>
          <ProventosProvider>
            <App />
          </ProventosProvider>
        </TransactionsProvider>
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);
