import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { ShortUrl } from '../api/types';

export function DashboardPage() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setListError('');
    try {
      const { data } = await api.listUrls();
      setUrls(data);
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Could not load your links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError('');
    setBusy(true);

    try {
      const created = await api.createUrl({
        originalUrl: originalUrl.trim(),
        customAlias: customAlias.trim() || undefined,
      });
      setUrls((current) => [created, ...current]);
      setOriginalUrl('');
      setCustomAlias('');
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.fieldMessages || err.message);
      } else {
        setFormError('Could not reach the server');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(url: ShortUrl) {
    if (!window.confirm(`Delete /${url.shortCode}? This can't be undone.`)) return;

    // Optimistic — put it back if the server disagrees.
    const previous = urls;
    setUrls((current) => current.filter((u) => u.id !== url.id));

    try {
      await api.deleteUrl(url.id);
    } catch {
      setUrls(previous);
      setListError('Could not delete that link');
    }
  }

  async function handleCopy(url: ShortUrl) {
    await navigator.clipboard.writeText(url.shortUrl);
    setCopied(url.id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="stack-lg">
      <section className="card">
        <h1>Shorten a link</h1>
        <form onSubmit={handleCreate} className="create-form">
          <label className="grow">
            Destination URL
            <input
              type="url"
              placeholder="https://example.com/a/very/long/path"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </label>

          <label>
            Custom alias <span className="muted">(optional)</span>
            <input
              placeholder="my-link"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              pattern="[A-Za-z0-9_\-]{3,32}"
              title="3–32 letters, numbers, hyphens or underscores"
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Shortening…' : 'Shorten'}
          </button>
        </form>

        {formError && <p className="error">{formError}</p>}
      </section>

      <section className="card">
        <h2>Your links</h2>

        {listError && <p className="error">{listError}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : urls.length === 0 ? (
          <p className="muted">Nothing here yet — shorten your first link above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Short link</th>
                <th>Destination</th>
                <th className="numeric">Clicks</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => (
                <tr key={url.id}>
                  <td>
                    <a href={url.shortUrl} target="_blank" rel="noreferrer" className="mono">
                      /{url.shortCode}
                    </a>
                  </td>
                  <td className="truncate" title={url.originalUrl}>
                    {url.originalUrl}
                  </td>
                  <td className="numeric">{url.clickCount}</td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => handleCopy(url)}>
                      {copied === url.id ? 'Copied' : 'Copy'}
                    </button>
                    <Link className="btn btn-ghost" to={`/urls/${url.id}`}>
                      Details
                    </Link>
                    <button
                      type="button"
                      className="btn btn-ghost danger"
                      onClick={() => handleDelete(url)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
