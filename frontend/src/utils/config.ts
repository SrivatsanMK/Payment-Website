// Central configuration for Backend URLs

export const BACKEND_URL = (import.meta as any).env?.VITE_API_URL 
  ? (import.meta as any).env.VITE_API_URL 
  : `http://${window.location.hostname}:5000`;

export const API_URL = `${BACKEND_URL}/api`;

export const getAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BACKEND_URL}${cleanPath}`;
  }
  return path;
};
