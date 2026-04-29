'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api } from '../lib/apiClient';

interface User {
  id: string;
  email: string;
  name: string | null;
  is_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyMagicLink: (token: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  sendMagicLink: async () => ({ success: false }),
  verifyMagicLink: async () => ({ success: false }),
  logout: async () => {},
  clearError: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.auth.me();
        if (response.success && response.data) {
          setUser((response.data as { user: User }).user);
        } else {
          // Token is invalid
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthResponse = (data: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    setError(null);
  };

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const response = await api.auth.login(email, password);

    if (response.success && response.data) {
      handleAuthResponse(response.data as { accessToken: string; refreshToken: string; user: User });
      return { success: true };
    }

    const errorMsg = response.error?.message || 'Login failed';
    setError(errorMsg);
    return { success: false, error: errorMsg };
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    const response = await api.auth.register(email, password, name);

    if (response.success && response.data) {
      handleAuthResponse(response.data as { accessToken: string; refreshToken: string; user: User });
      return { success: true };
    }

    const errorMsg = response.error?.message || 'Registration failed';
    setError(errorMsg);
    return { success: false, error: errorMsg };
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    setError(null);
    const response = await api.auth.magicLink(email);

    if (response.success) {
      return { success: true };
    }

    const errorMsg = response.error?.message || 'Failed to send magic link';
    setError(errorMsg);
    return { success: false, error: errorMsg };
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    setError(null);
    const response = await api.auth.verifyMagicLink(token);

    if (response.success && response.data) {
      handleAuthResponse(response.data as { accessToken: string; refreshToken: string; user: User });
      return { success: true };
    }

    const errorMsg = response.error?.message || 'Magic link verification failed';
    setError(errorMsg);
    return { success: false, error: errorMsg };
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        sendMagicLink,
        verifyMagicLink,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { AuthContext };
