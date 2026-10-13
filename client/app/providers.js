'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import store from '@/store/store';
import { hydrate, refreshUser } from '@/store/authSlice';

export default function Providers({ children }) {
  useEffect(() => {
    store.dispatch(hydrate());
    // Re-check the saved login with the server (picks up vendor approval, expired tokens)
    if (store.getState().auth.token) store.dispatch(refreshUser());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
