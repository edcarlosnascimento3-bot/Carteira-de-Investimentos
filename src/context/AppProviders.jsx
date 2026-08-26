import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { TransactionsProvider } from './TransactionsContext';
import { ProventosProvider } from './ProventosContext';
import { RfManualProvider } from './RfManualContext';
import { MetasProvider } from './MetasContext';

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <UserProvider>
        <TransactionsProvider>
          <ProventosProvider>
            <RfManualProvider>
              <MetasProvider>
                {children}
              </MetasProvider>
            </RfManualProvider>
          </ProventosProvider>
        </TransactionsProvider>
      </UserProvider>
    </AuthProvider>
  );
}
