import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { clearGuestId } from "../utils/cookieGuest";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch (_error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(() => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    clearGuestId();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      checkAuth,
    }),
    [user, loading, login, logout, checkAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
