import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { apiService } from '@/services/api';
import type { AuthUser, AuthResult } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, role?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/signup'];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const location = useLocation();

  const loadSession = useCallback(async () => {
    const response = await apiService.getSession();
    if (response.success && response.data?.user) {
      setUser(response.data.user);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (PUBLIC_PATHS.includes(location.pathname)) {
        if (active) {
          setReady(true);
        }
        return;
      }

      await loadSession();
      if (active) {
        setReady(true);
      }
    };

    setReady(false);
    init();

    return () => {
      active = false;
    };
  }, [location.pathname, loadSession]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await apiService.login(email, password);

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      }

      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const signup = async (email: string, password: string, role?: string): Promise<AuthResult> => {
    try {
      const response = await apiService.signup(email, password, role);

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true, message: response.message };
      }

      return { success: false, message: response.message || 'Signup failed' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch {
      // Clear local session even if the API call fails
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
