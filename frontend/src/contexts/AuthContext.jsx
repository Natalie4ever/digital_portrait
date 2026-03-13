import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../api';
import { getToken, clearToken } from '../api';

const AuthContext = createContext(null);

const IDLE_MINUTES = 60; // 1 小时无操作视为登出（后端 token 也是 60 分钟）

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const value = { user, loading, refreshUser, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
