/**
 * API Service
 * Handles all HTTP requests to the backend
 */

import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies in requests
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      const { store } = require("../store");
      const { resetAuth } = require("../store/authStore");
      store.dispatch(resetAuth());
    }

    // Always reject the error to let the caller handle it
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => apiClient.post("/auth/register", data),
  login: (data) => apiClient.post("/auth/login", data),
  logout: () => apiClient.get("/auth/logout"),
  getMe: () => apiClient.get("/auth/me"),
  updateProfile: (data) => apiClient.put("/auth/update", data),
};

// URL API calls
export const urlAPI = {
  createShortUrl: (data) => apiClient.post("/url/create", data),
  listUrls: (params) => apiClient.get("/url/list", { params }),
  getUrl: (id) => apiClient.get(`/url/${id}`),
  updateUrl: (id, data) => apiClient.put(`/url/${id}`, data),
  deleteUrl: (id) => apiClient.delete(`/url/${id}`),
};

// Analytics API calls
export const analyticsAPI = {
  getUrlAnalytics: (urlId, params) =>
    apiClient.get(`/analytics/${urlId}`, { params }),
  getDashboardAnalytics: (params) =>
    apiClient.get("/analytics/dashboard", { params }),
};

// Plan API calls
export const planAPI = {
  getPlans: () => apiClient.get("/plan"),
  getCurrentPlan: () => apiClient.get("/plan/current"),
  upgradePlan: (data) => apiClient.post("/plan/upgrade", data),
};

export default apiClient;
