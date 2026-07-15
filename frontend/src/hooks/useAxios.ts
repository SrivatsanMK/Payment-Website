import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';

const API_URL = `http://${window.location.hostname}:5000/api`;

export const useAxios = () => {
  const customerAuth = useAuth();
  const adminAuth = useAdminAuth();

  const isAdminPath = window.location.pathname.startsWith('/admin');
  const auth = isAdminPath ? adminAuth : customerAuth;
  const { accessToken, refreshAccessToken, logout } = auth;

  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  instance.interceptors.request.use(
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
  instance.interceptors.response.use(
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
            return instance(originalRequest);
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

  return instance;
};

export default useAxios;
