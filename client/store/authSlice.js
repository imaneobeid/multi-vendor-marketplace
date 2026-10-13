import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { AUTH_KEY, errorMessage } from '@/lib/api';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    return data;
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const refreshUser = createAsyncThunk('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.status || 0);
  }
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, token: null, ready: false, status: 'idle', error: null },
  reducers: {
    hydrate(state) {
      try {
        const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
        if (saved?.token) {
          state.token = saved.token;
          state.user = saved.user;
        }
      } catch {}
      state.ready = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.status = 'loading';
      state.error = null;
    };
    const fulfilled = (state, action) => {
      state.status = 'idle';
      state.user = action.payload.user;
      state.token = action.payload.token;
    };
    const rejected = (state, action) => {
      state.status = 'idle';
      state.error = action.payload || 'Something went wrong';
    };
    builder
      .addCase(login.pending, pending)
      .addCase(login.fulfilled, fulfilled)
      .addCase(login.rejected, rejected)
      .addCase(register.pending, pending)
      .addCase(register.fulfilled, fulfilled)
      .addCase(register.rejected, rejected)
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(refreshUser.rejected, (state, action) => {
        // Token expired or user deleted: log out. (Ignore network errors.)
        if (action.payload === 401) {
          state.user = null;
          state.token = null;
        }
      });
  },
});

export const { hydrate, logout, clearError } = slice.actions;
export default slice.reducer;
