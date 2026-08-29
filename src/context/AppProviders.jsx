import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { TransactionsProvider } from './TransactionsContext';
import { ProventosProvider } from './ProventosContext';
import { RfManualProvider } from './RfManualContext';
import { MetasProvider } from './MetasContext';
import { IRRF2Provider } from './IRRF2Context';

function DataProviders({ children }) {
  return (
    <TransactionsProvider>
      <ProventosProvider>
        <RfManualProvider>
          <MetasProvider>
            <IRRF2Provider>
              {children}
            </IRRF2Provider>
          </MetasProvider>
        </RfManualProvider>
      </ProventosProvider>
    </TransactionsProvider>
  );
}

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <UserProvider>
        <DataProviders>
          {children}
        </DataProviders>
      </UserProvider>
    </AuthProvider>
  );
}
