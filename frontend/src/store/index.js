import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./authStore";
import { urlReducer } from "./urlStore";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    url: urlReducer,
  },
});

export const selectAuthState = (state) => state.auth;
export const selectUrlState = (state) => state.url;

export default store;
