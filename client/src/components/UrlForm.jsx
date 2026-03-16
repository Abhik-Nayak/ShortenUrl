import { useState } from "react";
import { Icon } from "@iconify/react";
import { useUrls } from "../context/UrlContext";

const UrlForm = ({ isPro }) => {
  const { createShortUrl } = useUrls();
  const [originalUrl, setOriginalUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        originalUrl,
        expiresAt: expiresAt || undefined,
      };

      if (isPro && customAlias.trim()) {
        payload.customAlias = customAlias.trim();
      }

      const result = await createShortUrl(payload);
      setCreated(result);
      setOriginalUrl("");
      setCustomAlias("");
      setExpiresAt("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not create short URL");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Long URL</label>
          <input
            type="url"
            required
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
          />
        </div>

        {isPro && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Custom Alias</label>
            <input
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder="my-custom-link"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Expiration Date (Optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-brand-500 focus:ring"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          <Icon icon="mdi:link-plus" />
          {submitting ? "Creating..." : "Create Short URL"}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {created ? (
        <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 p-3">
          <p className="text-sm text-slate-700">Short URL:</p>
          <a href={created.shortUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
            {created.shortUrl}
          </a>
          {created.qrCode ? (
            <img src={created.qrCode} alt="QR" className="mt-3 h-28 w-28 rounded-md border border-slate-200 bg-white p-1" />
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default UrlForm;
