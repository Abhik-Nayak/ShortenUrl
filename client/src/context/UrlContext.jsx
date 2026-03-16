import { createContext, useCallback, useContext, useMemo, useState } from "react";
import api from "../api/axios";

const UrlContext = createContext(null);

export const UrlProvider = ({ children }) => {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyUrls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/url/my");
      setUrls(data.urls || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const createShortUrl = useCallback(async (payload) => {
    const { data } = await api.post("/api/url/shorten", payload);
    setUrls((prev) => [data.url, ...prev]);
    return data.url;
  }, []);

  const deleteUrl = useCallback(async (id) => {
    await api.delete(`/api/url/${id}`);
    setUrls((prev) => prev.filter((row) => row._id !== id));
  }, []);

  const value = useMemo(
    () => ({
      urls,
      loading,
      fetchMyUrls,
      createShortUrl,
      deleteUrl,
    }),
    [urls, loading, fetchMyUrls, createShortUrl, deleteUrl]
  );

  return <UrlContext.Provider value={value}>{children}</UrlContext.Provider>;
};

export const useUrls = () => {
  const ctx = useContext(UrlContext);
  if (!ctx) {
    throw new Error("useUrls must be used inside UrlProvider");
  }
  return ctx;
};
