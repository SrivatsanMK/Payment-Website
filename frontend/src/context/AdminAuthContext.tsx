import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface AdminUser {
  id: string;
  role: 'ADMIN_1' | 'ADMIN_2';
  email: string;
  name: string;
  profilePicture?: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  accessToken: string | null;
  login: (data: { identifier: string; password: string }) => Promise<any>;
  logout: () => void;
  updateAdminProfile: (updated: Partial<AdminUser>) => void;
  refreshAccessToken: () => Promise<string | null>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const API_URL = `http://${window.location.hostname}:5000/api`;

// Separate storage keys — never collides with customer session
const STORAGE_KEYS = {
  user: 'admin_user',
  accessToken: 'admin_accessToken',
  refreshToken: 'admin_refreshToken',
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = sessionStorage.getItem(STORAGE_KEYS.user);
      const storedAccess = sessionStorage.getItem(STORAGE_KEYS.accessToken);
      const storedRefresh = sessionStorage.getItem(STORAGE_KEYS.refreshToken);

      if (storedUser && storedAccess && storedRefresh) {
        const parsed = JSON.parse(storedUser);
        if (parsed.role !== 'ADMIN_1' && parsed.role !== 'ADMIN_2') {
          handleLogout();
          setLoading(false);
          return;
        }
        setAdmin(parsed);
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
    setAdmin(null);
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
      const res = await axios.post(`${API_URL}/auth/admin/login`, payload);
      if (res.data.success) {
        const { accessToken: access, refreshToken: refresh, user: loggedUser } = res.data;
        if (loggedUser.role !== 'ADMIN_1' && loggedUser.role !== 'ADMIN_2') {
          throw 'Access denied. This portal is for administrators only.';
        }
        sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(loggedUser));
        sessionStorage.setItem(STORAGE_KEYS.accessToken, access);
        sessionStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
        setAdmin(loggedUser);
        setAccessToken(access);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        return res.data;
      }
    } catch (error: any) {
      throw error.response?.data?.message || error || 'Admin login failed';
    }
  };

  const updateAdminProfile = (updated: Partial<AdminUser>) => {
    if (!admin) return;
    const newProfile = { ...admin, ...updated };
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newProfile));
    setAdmin(newProfile);
  };

  return (
    <AdminAuthContext.Provider value={{
      admin, loading, accessToken,
      login: handleLogin,
      logout: handleLogout,
      updateAdminProfile,
      refreshAccessToken
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return context;
};
