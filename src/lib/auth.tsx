import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NodoSession {
  nodoId: string;
  nodoCodigo: string;
  nodoNome: string;
}

interface NodoAuthContextType {
  session: NodoSession | null;
  authLoading: boolean;
  login: (session: NodoSession) => Promise<void>;
  logout: () => Promise<void>;
}

const NodoAuthContext = createContext<NodoAuthContextType>({
  session: null,
  authLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function NodoAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<NodoSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@nex_nodo_session').then(raw => {
      if (raw) {
        try { setSession(JSON.parse(raw)); } catch {}
      }
      setAuthLoading(false);
    });
  }, []);

  async function login(s: NodoSession) {
    setSession(s);
    await AsyncStorage.setItem('@nex_nodo_session', JSON.stringify(s));
  }

  async function logout() {
    setSession(null);
    await AsyncStorage.removeItem('@nex_nodo_session');
  }

  return (
    <NodoAuthContext.Provider value={{ session, authLoading, login, logout }}>
      {children}
    </NodoAuthContext.Provider>
  );
}

export function useNodoAuth() {
  return useContext(NodoAuthContext);
}
