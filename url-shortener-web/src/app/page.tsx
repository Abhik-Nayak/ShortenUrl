"use client";

import { useState } from "react";

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShortUrl("");

    try {
      const res = await fetch("http://localhost:5000/api/urls/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to shorten URL");
      }

      setShortUrl(data.data.shortUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-mesh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg p-8 sm:p-10 rounded-[2.5rem] backdrop-blur-3xl bg-white/[0.05] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/10 ring-1 ring-white/20">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 drop-shadow-lg mb-4 tracking-tight">
            Shorten It.
          </h1>
          <p className="text-white/70 text-lg font-medium">
            Create sleek, shareable links in seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <input
              type="url"
              required
              placeholder="Paste your long URL here..."
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              className="relative w-full px-6 py-5 rounded-2xl bg-slate-900/60 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all backdrop-blur-xl text-lg font-medium shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full py-5 rounded-2xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Shortening...
                </>
              ) : (
                "Shorten URL"
              )}
            </span>
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-center font-medium shadow-lg backdrop-blur-md">
            {error}
          </div>
        )}

        {shortUrl && (
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-both">
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-purple-500/70 via-pink-500/70 to-orange-500/70 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
              <div className="flex bg-slate-900/95 rounded-[14px] p-2 pl-6 items-center justify-between backdrop-blur-xl">
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-300 hover:to-pink-300 transition-colors"
                >
                  {shortUrl}
                </a>
                <button
                  onClick={handleCopy}
                  className="ml-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90 flex items-center justify-center shrink-0 border border-white/5"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
