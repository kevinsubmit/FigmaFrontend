import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User, LoginRequest, RegisterRequest } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdminPortalUser = (currentUser: User | null) =>
    Boolean(currentUser && (currentUser.is_admin || currentUser.store_id));

  // 初始化时检查本地存储的用户信息
  useEffect(() => {
    const initAuth = async () => {
      const localUser = authService.getLocalUser();
      if (localUser && authService.isAuthenticated()) {
        try {
          // 验证Token是否有效，并获取最新用户信息
          const currentUser = await authService.getCurrentUser();
          if (isAdminPortalUser(currentUser)) {
            authService.logout();
            setUser(null);
            return;
          }
          setUser(currentUser);
        } catch (error) {
          // Token无效，清除本地存储
          authService.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      // 登录获取Token
      await authService.login(data);
      
      // 获取用户信息
      const user = await authService.getCurrentUser();
      if (isAdminPortalUser(user)) {
        authService.logout();
        setUser(null);
        throw new Error('Admin or store manager account must sign in from admin portal');
      }
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      // 注册用户
      const newUser = await authService.register(data);
      
      // 注册成功后自动登录
      await login({
        phone: data.phone,
        password: data.password,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (isAdminPortalUser(currentUser)) {
        authService.logout();
        setUser(null);
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
