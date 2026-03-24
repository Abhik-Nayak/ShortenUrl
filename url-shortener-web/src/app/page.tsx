"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ── */
interface HistoryItem {
  originalUrl: string;
  shortUrl: string;
  shortCode: string;
  createdAt: number;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  exiting?: boolean;
}

/* ── Toast container ── */
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${t.exiting ? "toast-exit" : "toast-enter"} pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-2xl backdrop-blur-2xl border shadow-2xl cursor-pointer select-none max-w-sm ${
            t.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300"
              : t.type === "error"
              ? "bg-red-500/15 border-red-500/25 text-red-300"
              : "bg-blue-500/15 border-blue-500/25 text-blue-300"
          }`}
          onClick={() => onDismiss(t.id)}
        >
          <span className="text-lg shrink-0">
            {t.type === "success" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : t.type === "error" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            )}
          </span>
          <span className="text-sm font-medium leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ── */
export default function Home() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const toastId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("url-history");
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  // Save history to localStorage
  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem("url-history", JSON.stringify(items));
  };

  // Toast helpers
  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShortUrl("");
    setShortCode("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/urls/shorten`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to shorten URL");
      }

      setShortUrl(data.data.shortUrl);
      setShortCode(data.data.shortCode);
      setSubmittedUrl(originalUrl);

      const item: HistoryItem = {
        originalUrl,
        shortUrl: data.data.shortUrl,
        shortCode: data.data.shortCode,
        createdAt: Date.now(),
      };
      const updated = [item, ...history.filter((h) => h.shortCode !== data.data.shortCode)].slice(0, 10);
      saveHistory(updated);

      addToast(
        data.message === "Short URL already exists"
          ? "URL already shortened — here it is!"
          : "Short link created successfully!",
        "success"
      );
      setOriginalUrl("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      addToast("Copied to clipboard!", "success");
    } catch {
      addToast("Failed to copy", "error");
    }
  };

  const clearHistory = () => {
    saveHistory([]);
    addToast("History cleared", "info");
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const truncateUrl = (url: string, max = 40) =>
    url.length > max ? url.slice(0, max) + "..." : url;

  return (
    <main className="relative min-h-screen bg-mesh flex flex-col items-center justify-start pt-16 sm:pt-24 px-4 pb-12">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header badge */}
      <div className="mb-8 flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-white/60 tracking-wide uppercase">
          Fast &bull; Scalable &bull; Distributed
        </span>
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-xl">
        {/* Animated border glow */}
        <div className="absolute -inset-[1px] rounded-[2rem] bg-[conic-gradient(from_var(--border-angle),transparent_30%,rgba(139,92,246,0.5)_50%,transparent_70%)] gradient-border opacity-60" />

        <div className="relative noise rounded-[2rem] backdrop-blur-3xl bg-white/[0.04] border border-white/[0.08] shadow-[0_8px_64px_rgba(0,0,0,0.5)] p-8 sm:p-10">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-white/10 mb-5">
              <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25l4.5 4.5" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 tracking-tight mb-3">
              Shorten It.
            </h1>
            <p className="text-white/50 text-base font-medium max-w-xs mx-auto">
              Drop your link, get a blazing-fast short URL powered by distributed IDs.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/40 via-pink-500/40 to-amber-500/40 rounded-2xl blur-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center">
                <div className="absolute left-4 text-white/30 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25l4.5 4.5" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="url"
                  required
                  placeholder="https://example.com/your-very-long-url..."
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  className="relative w-full pl-12 pr-6 py-4.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all backdrop-blur-xl text-base font-medium"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="pulse-hover group relative w-full py-4.5 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(139,92,246,0.4)] hover:shadow-[0_4px_32px_rgba(139,92,246,0.6)] hover:brightness-110"
            >
              <span className="relative z-10 flex items-center justify-center gap-2.5">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Shortening...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform group-hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Shorten URL
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Result card */}
          {shortUrl && (
            <div className="mt-8 animate-slide-up">
              <div className="p-[1px] rounded-2xl bg-gradient-to-r from-violet-500/60 via-pink-500/60 to-amber-500/60">
                <div className="rounded-[15px] bg-white/[0.04] backdrop-blur-xl p-5 space-y-4">
                  {/* Short URL */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">Your short link</p>
                      <a
                        href={shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 hover:opacity-80 transition-opacity"
                      >
                        {shortUrl}
                      </a>
                    </div>
                    <button
                      onClick={() => handleCopy(shortUrl)}
                      className="shrink-0 p-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/70 hover:text-white transition-all active:scale-90"
                      title="Copy to clipboard"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/[0.06]" />

                  {/* Original URL preview */}
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9 9 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white/30 font-medium">Original</p>
                      <p className="text-sm text-white/50 truncate">{submittedUrl}</p>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(shortUrl)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-white/80 text-sm font-semibold transition-all active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Visit
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History section */}
      {history.length > 0 && (
        <div className="w-full max-w-xl mt-8">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] backdrop-blur-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-white/50">
                Recent links
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-bold text-white/40">
                {history.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHistory && (
            <div className="mt-2 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl overflow-hidden">
              <div className="divide-y divide-white/[0.04]">
                {history.map((item, i) => (
                  <div
                    key={item.shortCode}
                    className="animate-fade-in-up flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                    style={{ animationDelay: `${i * 50}ms`, opacity: 0 }}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/15 to-pink-500/15 border border-white/[0.06] flex items-center justify-center">
                      <span className="text-xs font-bold text-violet-400/80">
                        {item.shortCode.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white/70 truncate">
                        {item.shortUrl}
                      </p>
                      <p className="text-xs text-white/30 truncate">
                        {truncateUrl(item.originalUrl)}
                      </p>
                    </div>
                    <span className="hidden sm:block text-[11px] text-white/20 font-medium shrink-0">
                      {timeAgo(item.createdAt)}
                    </span>
                    <button
                      onClick={() => handleCopy(item.shortUrl)}
                      className="shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all active:scale-90"
                      title="Copy"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/[0.04]">
                <button
                  onClick={clearHistory}
                  className="text-xs font-medium text-white/25 hover:text-red-400/70 transition-colors"
                >
                  Clear history
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer tech badges */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
        {["Snowflake IDs", "Redis Cache", "RabbitMQ", "MongoDB", "Next.js"].map((tech) => (
          <span
            key={tech}
            className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] font-semibold text-white/25 tracking-wide"
          >
            {tech}
          </span>
        ))}
      </div>
    </main>
  );
}
