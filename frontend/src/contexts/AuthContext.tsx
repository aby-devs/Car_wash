import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

  // Check if user is authenticated on app load
  useEffect(() => {
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
          console.log('Token verification failed, trying refresh...');
          // Token verification failed, try to refresh
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
          console.log('Token refresh failed, user not authenticated');
          // Both verify and refresh failed, user is not authenticated
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
        console.log('Token refresh failed:', response.message);
        return false;
      }
    } catch (error) {
      console.log('Token refresh failed with error:', error);
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

  
  // Test backend connection
  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/auth/health`, {
          credentials: 'include'
        });
        const data = await response.json();
        console.log('Backend health check:', data);
      } catch (error) {
        console.error('Backend health check failed:', error);
      }
    };
    testBackend();
  }, []);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
