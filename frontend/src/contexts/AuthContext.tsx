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
  login: (email: string, password: string) => Promise<boolean>;
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

  // Check if user is authenticated on app load (only if cookies exist)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have any auth cookies first
        const hasAuthCookies = document.cookie.includes('accessToken') || document.cookie.includes('refreshToken');
        
        if (!hasAuthCookies) {
          // No cookies, user is not logged in
          setUser(null);
          setLoading(false);
          return;
        }

        // We have cookies, try to verify the token first
        try {
          const response = await apiService.verifyToken();
          if (response.success && response.data) {
            setUser(response.data.user);
            setLoading(false);
            return;
          }
        } catch (verifyError) {
          console.log('Token verification failed, attempting refresh:', verifyError);
        }

        // If verify failed, try to refresh the token
        const refreshSuccess = await refreshAuthToken();
        if (refreshSuccess) {
          // After successful refresh, try to verify again
          try {
            const response = await apiService.verifyToken();
            if (response.success && response.data) {
              setUser(response.data.user);
            } else {
              setUser(null);
            }
          } catch (error) {
            console.error('Token verification after refresh failed:', error);
            setUser(null);
          }
        } else {
          // Refresh failed, clear user state
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const clearAuthData = () => {
    setUser(null);
  };

  const refreshAuthToken = async (): Promise<boolean> => {
    try {
      console.log('Attempting to refresh token...');
      const response = await apiService.refreshToken();
      console.log('Refresh token response:', response);
      
      if (response.success) {
        console.log('Token refreshed successfully');
        return true;
      } else {
        console.error('Token refresh failed:', response.message);
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed with error:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
    }
    return false;
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
    login,
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
