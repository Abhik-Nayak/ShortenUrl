/**
 * Auth Store
 * Manages user authentication state using Redux Toolkit
 */

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { authAPI } from "../services/apiService";
import { selectAuth } from "./authSelectors";

const initialState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  initialized: false,
};

export const initAuth = createAsyncThunk(
  "auth/initAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.getMe();
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Not authenticated");
    }
  },
  {
    condition: (_, { getState }) => {
      const authState = getState().auth;
      return !authState.initialized && !authState.isLoading;
    },
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (data, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (data, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      return null;
    } catch (err) {
      // Preserve previous behavior: clear local auth even if API logout fails.
      return rejectWithValue(err.response?.data?.message || "Logout failed");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Update failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.initialized = true;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.initialized = true;
        state.error = null;
      })
      .addCase(initAuth.rejected, (state) => {
        // Failed init means user is unauthenticated; still mark app init complete.
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.initialized = true;
        state.error = null;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.initialized = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Registration failed";
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.initialized = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.initialized = true;
        state.isLoading = false;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.initialized = true;
        state.isLoading = false;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Update failed";
      });
  },
});

export const { clearError, resetAuth } = authSlice.actions;
export const authReducer = authSlice.reducer;

const unwrapWithAxiosErrorShape = (promise) =>
  promise.catch((err) => {
    if (typeof err === "string") {
      const normalizedError = new Error(err);
      normalizedError.response = { data: { message: err } };
      throw normalizedError;
    }
    throw err;
  });

const createBoundAuthApi = (state, dispatch) => ({
  ...state,
  initAuth: () => unwrapWithAxiosErrorShape(dispatch(initAuth()).unwrap()),
  register: (data) => unwrapWithAxiosErrorShape(dispatch(register(data)).unwrap()),
  login: (data) => unwrapWithAxiosErrorShape(dispatch(login(data)).unwrap()),
  logout: () =>
    unwrapWithAxiosErrorShape(dispatch(logout()).unwrap()).catch(() => undefined),
  updateProfile: (data) =>
    unwrapWithAxiosErrorShape(dispatch(updateProfile(data)).unwrap()),
  clearError: () => dispatch(clearError()),
  resetAuth: () => dispatch(resetAuth()),
});

export const useAuthStore = (selector) => {
  const authState = useSelector(selectAuth);
  const dispatch = useDispatch();
  const api = createBoundAuthApi(authState, dispatch);

  if (typeof selector === "function") {
    return selector(api);
  }

  return api;
};

export default useAuthStore;
