import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { AUTH_KEY } from '@/lib/api';

const store = configureStore({ reducer: { auth: authReducer } });

// Keep the login saved in the browser
store.subscribe(() => {
  if (typeof window === 'undefined') return;
  const { user, token, ready } = store.getState().auth;
  if (!ready) return;
  if (token) localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
  else localStorage.removeItem(AUTH_KEY);
});

export default store;
