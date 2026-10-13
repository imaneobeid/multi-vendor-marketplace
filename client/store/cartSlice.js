import { createSlice } from '@reduxjs/toolkit';

export const CART_KEY = 'souk_cart';

const slice = createSlice({
  name: 'cart',
  initialState: { items: [], ready: false },
  reducers: {
    hydrateCart(state) {
      try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY) || 'null');
        if (Array.isArray(saved)) state.items = saved;
      } catch {}
      state.ready = true;
    },
    addToCart(state, { payload }) {
      const { product, quantity = 1 } = payload;
      const max = product.stock;
      const existing = state.items.find((i) => i.productId === product._id);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + quantity, max);
        existing.stock = max;
        existing.price = product.price;
      } else {
        state.items.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || null,
          store: product.vendor?.storeName || '',
          stock: max,
          quantity: Math.min(quantity, max),
        });
      }
    },
    setQuantity(state, { payload }) {
      const item = state.items.find((i) => i.productId === payload.productId);
      if (!item) return;
      item.quantity = Math.max(1, Math.min(payload.quantity, item.stock));
    },
    removeFromCart(state, { payload }) {
      state.items = state.items.filter((i) => i.productId !== payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { hydrateCart, addToCart, setQuantity, removeFromCart, clearCart } = slice.actions;
export default slice.reducer;
