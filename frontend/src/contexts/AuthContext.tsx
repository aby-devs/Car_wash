import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';

interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, role?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Check if user is authenticated on app load (skip on public auth pages)
  useEffect(() => {
    const publicPaths = ['/login', '/signup'];
    if (publicPaths.includes(window.location.pathname)) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    const checkAuth = async () => {
      try {
        // First, try to verify the token
        try {
          const response = await apiService.verifyToken();
          if (response.success && response.data) {
            setUser(response.data.user);
            setLoading(false);
            setInitialized(true);
            return;
          }
        } catch (verifyError) {
          // No valid session — try refresh below
        }

        // If verify failed, try to refresh the token
        try {
          const refreshSuccess = await refreshAuthToken();
          if (refreshSuccess) {
            // Refresh was successful, user should be set in refreshAuthToken
            setLoading(false);
            setInitialized(true);
            return;
          }
        } catch (refreshError) {
          // Not authenticated
        }

        // If both verify and refresh failed, user is not authenticated
        setUser(null);
        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, []);

  const clearAuthData = () => {
    setUser(null);
  };

  const refreshAuthToken = async (): Promise<boolean> => {
    try {
      const response = await apiService.refreshToken();
      if (response.success) {
        // After successful refresh, get user data
        try {
          const verifyResponse = await apiService.verifyToken();
          if (verifyResponse.success && verifyResponse.data) {
            setUser(verifyResponse.data.user);
            return true;
          }
        } catch (verifyError) {
          console.error('Failed to get user data after refresh:', verifyError);
          return false;
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return true;
      } else {
        console.error('Login failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, role?: string): Promise<boolean> => {
    try {
      const response = await apiService.signup(email, password, role);
      if (response.success) {
        return true;
      } else {
        console.error('Signup failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Signup failed:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    clearAuthData();
  };

  const value: AuthContextType = {
    user,
    loading,
    initialized,
    login,
    signup,
    logout,
    refreshAuthToken,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
