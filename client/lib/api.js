import axios from 'axios';
import { requestStarted, requestFinished } from '@/lib/wake';

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const AUTH_KEY = 'souk_auth';

const api = axios.create({ baseURL: `${API_ORIGIN}/api`, timeout: 70000 });

const WAKE_RETRIES = 15; // 15 tries, 3 seconds apart: enough for a sleeping free server (about a minute)

api.interceptors.request.use((config) => {
  // Attach the saved login token to every request
  if (typeof window !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (saved?.token) config.headers.Authorization = `Bearer ${saved.token}`;
    } catch {}
  }
  // Reading requests are watched for slowness (see lib/wake.js)
  const isRead = (config.method || 'get').toLowerCase() === 'get';
  if (isRead && !config.__counted) {
    config.__counted = true;
    requestStarted();
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.config.__counted) requestFinished();
    return response;
  },
  async (error) => {
    const config = error.config;
    if (config && config.__counted) {
      const status = error.response?.status;
      const serverAsleep = !error.response || [502, 503, 504].includes(status);
      config.__retries = config.__retries || 0;
      // A reading request that fails because the server is still waking up is simply tried again
      if (serverAsleep && config.__retries < WAKE_RETRIES) {
        config.__retries += 1;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return api(config);
      }
      requestFinished();
    }
    return Promise.reject(error);
  }
);

// Product images are stored as "/api/images/<id>" (or a full https address when an
// external image service is used)
export const imageUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
};

export const errorMessage = (err) =>
  err.response?.data?.message ||
  (err.request ? 'Cannot reach the server. It may be waking up, so please try again in a moment.' : err.message);

export default api;
