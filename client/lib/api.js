import axios from 'axios';

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const AUTH_KEY = 'souk_auth';

const api = axios.create({ baseURL: `${API_ORIGIN}/api` });

// Attach the saved login token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (saved?.token) config.headers.Authorization = `Bearer ${saved.token}`;
    } catch {}
  }
  return config;
});

// Product images are stored as "/api/images/<id>" and need the server address in front
export const imageUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
};

export const errorMessage = (err) =>
  err.response?.data?.message ||
  (err.request ? 'Cannot reach the server. Is the backend running?' : err.message);

export default api;
