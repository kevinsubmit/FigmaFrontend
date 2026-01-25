import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, fetchCurrentUser, setToken } from '../api/client';

export type AdminRole = 'super_admin' | 'store_admin';

export interface AdminUser {
  id: number;
  username: string;
  phone: string;
  full_name?: string | null;
  is_admin: boolean;
  store_id?: number | null;
}

interface AuthContextValue {
  user: AdminUser | null;
  role: AdminRole | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveRole = (currentUser: AdminUser | null): AdminRole | null => {
    if (!currentUser) return null;
    if (currentUser.is_admin) return 'super_admin';
    if (currentUser.store_id) return 'store_admin';
    return null;
  };

  const refreshUser = async () => {
    try {
      const data = await fetchCurrentUser();
      setUser(data);
    } catch (error) {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (phone: string, password: string) => {
    const response = await api.post('/auth/login', { phone, password });
    setToken(response.data.access_token, response.data.refresh_token);
    await refreshUser();
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const role = useMemo(() => resolveRole(user), [user]);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
