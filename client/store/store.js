import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer, { CART_KEY } from './cartSlice';
import { AUTH_KEY } from '@/lib/api';

const store = configureStore({ reducer: { auth: authReducer, cart: cartReducer } });

// Keep the login and the cart saved in the browser
store.subscribe(() => {
  if (typeof window === 'undefined') return;
  const { auth, cart } = store.getState();

  if (auth.ready) {
    if (auth.token) localStorage.setItem(AUTH_KEY, JSON.stringify({ user: auth.user, token: auth.token }));
    else localStorage.removeItem(AUTH_KEY);
  }
  if (cart.ready) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart.items));
  }
});

export default store;
