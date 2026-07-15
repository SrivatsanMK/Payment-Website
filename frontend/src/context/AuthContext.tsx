import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  role: 'Customer';
  email: string;
  name: string;
  customerId?: string;
  forcedPasswordReset?: boolean;
  profilePicture?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  login: (data: { identifier: string; password: string }) => Promise<any>;
  logout: () => void;
  updateUserProfile: (updatedUser: Partial<User>) => void;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = `http://${window.location.hostname}:5000/api`;

// Customer-specific storage keys — isolated from admin session
const STORAGE_KEYS = {
  user: 'customer_user',
  accessToken: 'customer_accessToken',
  refreshToken: 'customer_refreshToken',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = sessionStorage.getItem(STORAGE_KEYS.user);
      const storedAccess = sessionStorage.getItem(STORAGE_KEYS.accessToken);
      const storedRefresh = sessionStorage.getItem(STORAGE_KEYS.refreshToken);

      if (storedUser && storedAccess && storedRefresh) {
        const parsed = JSON.parse(storedUser);
        // Only accept Customer role — reject admins
        if (parsed.role !== 'Customer') {
          handleLogout();
          setLoading(false);
          return;
        }
        setUser(parsed);
        setAccessToken(storedAccess);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedAccess}`;

        try {
          const res = await axios.post(`${API_URL}/auth/refresh-token`, { token: storedRefresh });
          if (res.data.success) {
            const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
            sessionStorage.setItem(STORAGE_KEYS.accessToken, newAccess);
            sessionStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
            setAccessToken(newAccess);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
          }
        } catch {
          handleLogout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => refreshAccessToken(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accessToken]);

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEYS.user);
    sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    setUser(null);
    setAccessToken(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    const storedRefresh = sessionStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!storedRefresh) { handleLogout(); return null; }
    try {
      const res = await axios.post(`${API_URL}/auth/refresh-token`, { token: storedRefresh });
      if (res.data.success) {
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
        sessionStorage.setItem(STORAGE_KEYS.accessToken, newAccess);
        sessionStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
        setAccessToken(newAccess);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
        return newAccess;
      }
    } catch {
      handleLogout();
    }
    return null;
  };

  const handleLogin = async (payload: { identifier: string; password: string }) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, payload);
      if (res.data.success) {
        const { accessToken: access, refreshToken: refresh, user: loggedUser } = res.data;
        if (loggedUser.role !== 'Customer') {
          throw 'Access denied. This portal is for customers only.';
        }
        sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(loggedUser));
        sessionStorage.setItem(STORAGE_KEYS.accessToken, access);
        sessionStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
        setUser(loggedUser);
        setAccessToken(access);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        return res.data;
      }
    } catch (error: any) {
      throw error.response?.data?.message || error || 'Login failed';
    }
  };

  const updateUserProfile = (updatedUser: Partial<User>) => {
    if (!user) return;
    const newProfile = { ...user, ...updatedUser };
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newProfile));
    setUser(newProfile);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, accessToken,
      login: handleLogin,
      logout: handleLogout,
      updateUserProfile,
      refreshAccessToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
