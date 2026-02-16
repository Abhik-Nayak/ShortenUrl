/**
 * URL Store
 * Manages URL/link state using Zustand
 */

import { create } from "zustand";
import { urlAPI } from "../services/apiService";

export const useUrlStore = create((set, get) => ({
  urls: [],
  isLoading: false,
  error: null,
  totalUrls: 0,
  currentPage: 1,

  // Fetch all URLs
  fetchUrls: async (params = {}) => {
    try {
      set({ isLoading: true });
      const response = await urlAPI.listUrls(params);
      set({
        urls: response.data.urls,
        totalUrls: response.data.pagination.total,
        currentPage: response.data.pagination.page,
        isLoading: false,
      });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to fetch URLs", isLoading: false });
      throw err;
    }
  },

  // Create short URL
  createShortUrl: async (data) => {
    try {
      set({ isLoading: true });
      const response = await urlAPI.createShortUrl(data);
      // Add to URLs list
      set((state) => ({
        urls: [response.data.url, ...state.urls],
        isLoading: false,
      }));
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to create short URL", isLoading: false });
      throw err;
    }
  },

  // Get single URL
  getUrl: async (id) => {
    try {
      set({ isLoading: true });
      const response = await urlAPI.getUrl(id);
      set({ isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to fetch URL", isLoading: false });
      throw err;
    }
  },

  // Update URL
  updateUrl: async (id, data) => {
    try {
      set({ isLoading: true });
      const response = await urlAPI.updateUrl(id, data);
      // Update in URLs list
      set((state) => ({
        urls: state.urls.map((url) =>
          url._id === id ? { ...url, ...response.data.url } : url
        ),
        isLoading: false,
      }));
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to update URL", isLoading: false });
      throw err;
    }
  },

  // Delete URL
  deleteUrl: async (id) => {
    try {
      set({ isLoading: true });
      const response = await urlAPI.deleteUrl(id);
      // Remove from URLs list
      set((state) => ({
        urls: state.urls.filter((url) => url._id !== id),
        isLoading: false,
      }));
      return response.data;
    } catch (err) {
      set({ error: err.response?.data?.message || "Failed to delete URL", isLoading: false });
      throw err;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export default useUrlStore;
