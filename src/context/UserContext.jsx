import { createContext, useContext, useState, useEffect } from 'react';
import db from '../services/storage';

const UserContext = createContext(null);

const STORAGE_NAME = 'user';

export function UserProvider({ children }) {
  const [userName, setUserName] = useState('Investidor');
  const [avatar, setAvatar] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.read(STORAGE_NAME).then((data) => {
      if (data) {
        if (data.userName) setUserName(data.userName);
        if (data.avatar) setAvatar(data.avatar);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      db.write(STORAGE_NAME, { userName, avatar });
    }
  }, [userName, avatar, loaded]);

  return (
    <UserContext.Provider value={{ userName, setUserName, avatar, setAvatar }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser deve ser usado dentro de UserProvider');
  return ctx;
}
