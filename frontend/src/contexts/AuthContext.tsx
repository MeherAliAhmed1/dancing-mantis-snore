import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { auth } from '@/lib/api';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  updateUserIntegrations: (integrations: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      const response = await auth.me();
      // Ensure default values for integration flags if missing from backend
      // Map backend full_name to frontend name
      const userData: User = {
        ...response.data,
        name: response.data.full_name || response.data.name || 'User',
        granola_connected: response.data.granola_connected ?? false,
        notion_connected: response.data.notion_connected ?? false,
        gmail_connected: response.data.gmail_connected ?? false,
        google_calendar_connected: response.data.google_calendar_connected ?? false,
      };
      setUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Failed to fetch user", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Check for string 'undefined' which might have been stored by mistake
    if (token && token !== 'undefined' && token !== 'null') {
      fetchUser();
    } else {
      // Clean up invalid tokens
      if (token === 'undefined' || token === 'null') {
        localStorage.removeItem('token');
      }
      setIsLoading(false);
    }
  }, []);

  const login = async (data: any) => {
    const response = await auth.login(data);
    console.log('[Auth] Login response:', response.data);
    
    if (!response.data || !response.data.access_token) {
      console.error('[Auth] Invalid login response - missing access_token');
      throw new Error('Invalid response from server. Check console for details.');
    }
    
    localStorage.setItem('token', response.data.access_token);
    await fetchUser();
  };

  const register = async (data: any) => {
    const response = await auth.register(data);
    console.log('[Auth] Register response:', response.data);

    if (!response.data || !response.data.access_token) {
      console.error('[Auth] Invalid register response - missing access_token');
      throw new Error('Invalid response from server. Check console for details.');
    }

    localStorage.setItem('token', response.data.access_token);
    await fetchUser();
  };

  const loginWithGoogle = async () => {
    try {
      const response = await auth.getGoogleUrl();
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Failed to get Google Auth URL", error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsLoggedIn(false);
  };

  const updateUserIntegrations = (integrations: Partial<User>) => {
     setUser((prevUser) => {
      if (!prevUser) return null;
      return { ...prevUser, ...integrations };
    });
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, isLoading, login, register, loginWithGoogle, logout, updateUserIntegrations }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};