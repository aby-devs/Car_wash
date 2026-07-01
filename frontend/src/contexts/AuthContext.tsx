import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiService } from '@/services/api';
import type { AuthUser, AuthResult } from '@/types/auth';

const USER_STORAGE_KEY = 'car_wash_user';

interface AuthContextType {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string, role?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadStoredUser = (): AuthUser | null => {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveUser = (user: AuthUser | null) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await apiService.login(email, password);

      if (response.success && response.data?.user) {
        setUser(response.data.user);
        saveUser(response.data.user);
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
        saveUser(response.data.user);
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
    saveUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        ready: true,
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
