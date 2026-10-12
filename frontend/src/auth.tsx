import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler, type Config, type User } from './api';

interface AuthCtx {
  user: User | null;
  ready: boolean;
  config: Config;
  reloadConfig: () => void;
  unread: number;
  refreshUnread: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const DEFAULT_CONFIG: Config = { companyName: '', allowRegister: false, purposes: [] };

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [unread, setUnread] = useState(0);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUnread(0);
  }, []);

  const reloadConfig = useCallback(() => {
    api
      .get<Config>('/config')
      .then(setConfig)
      .catch(() => {});
  }, []);

  const refreshUnread = useCallback(() => {
    if (!getToken()) return;
    api
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => setUnread(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    reloadConfig();
    if (!getToken()) return setReady(true);
    api
      .get<{ user: User }>('/me')
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [logout, reloadConfig]);

  // Contador de não lidas: ao entrar, a cada 30 s e quando a aba volta a ficar visível.
  useEffect(() => {
    if (!user) return;
    refreshUnread();
    const id = setInterval(refreshUnread, 30_000);
    const onVis = () => document.visibilityState === 'visible' && refreshUnread();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.id, refreshUnread]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    setToken(r.token);
    setUser(r.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const r = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password });
    setToken(r.token);
    setUser(r.user);
  };

  return (
    <Ctx.Provider value={{ user, ready, config, reloadConfig, unread, refreshUnread, login, register, logout, setUser }}>
      {children}
    </Ctx.Provider>
  );
}
