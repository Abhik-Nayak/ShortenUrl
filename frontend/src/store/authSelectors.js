export const selectAuth = (state) => state.auth;
export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthInitialized = (state) => state.auth.initialized;
export const selectAuthError = (state) => state.auth.error;
