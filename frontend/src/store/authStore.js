/**
 * Auth Store
 * Manages user authentication state using Zustand
 */

import { create } from "zustand";
import { authAPI } from "../services/apiService";

// Global flag to prevent multiple initialization attempts
let initializationStarted = false;

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  initialized: false,

  // Initialize user from cookie on app load (only once globally)
  initAuth: async () => {
    // Double-check at global level first (fastest check)
    if (initializationStarted) {
      return;
    }

    const state = get();

    // Check again at store level
    if (state.initialized) {
      return;
    }

    try {
      initializationStarted = true;
      set({ isLoading: true });

      const response = await authAPI.getMe();

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        initialized: true,
        error: null
      });
    } catch (err) {
      // User is not authenticated - that's okay
      set({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        initialized: true,
        error: null
      });
    }
  },

  // Register user
  register: async (data) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.register(data);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Registration failed", isLoading: false });
      throw err;
    }
  },

  // Login user
  login: async (data) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.login(data);
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Login failed", isLoading: false });
      throw err;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      // Silently fail logout API call - we'll still clear the state
    } finally {
      // Always reset the auth state, regardless of API call result
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        initialized: true, // Keep initialized as true
      });
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      set({ isLoading: true });
      const response = await authAPI.updateProfile(data);
      set({ user: response.data.user, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Update failed", isLoading: false });
      throw err;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Reset auth state (for API interceptor or manual reset)
  resetAuth: () => set({
    user: null,
    isAuthenticated: false,
    error: null,
    initialized: true,
  }),
}));

export default useAuthStore;
