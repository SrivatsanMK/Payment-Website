import { useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { API_URL } from '../utils/config';

export const useAxios = () => {
  const customerAuth = useAuth();
  const adminAuth = useAdminAuth();

  const isAdminPath = window.location.pathname.startsWith('/admin');
  const auth = isAdminPath ? adminAuth : customerAuth;
  const { accessToken, refreshAccessToken, logout } = auth;

  const instance = useMemo(() => {
    const axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    axiosInstance.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If unauthorized (401) and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccess = await refreshAccessToken();
            if (newAccess) {
              originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
              return axiosInstance(originalRequest);
            } else {
              logout();
            }
          } catch (refreshError) {
            console.error('Interceptor token refresh failed:', refreshError);
            logout();
          }
        }

        return Promise.reject(error);
      }
    );

    return axiosInstance;
  }, [accessToken, refreshAccessToken, logout]);

  return instance;
};

export default useAxios;
