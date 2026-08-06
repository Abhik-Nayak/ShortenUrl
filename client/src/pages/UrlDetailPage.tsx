import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { Analytics, ShortUrl } from '../api/types';

export function UrlDetailPage() {
  const { id = '' } = useParams();

  const [url, setUrl] = useState<ShortUrl | null>(null);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [destination, setDestination] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const load = useCallback(async () => {
    try {
      const [urlData, statsData] = await Promise.all([api.getUrl(id), api.analytics(id)]);
      setUrl(urlData);
      setStats(statsData);
      setDestination(urlData.originalUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this link');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaveState('saving');

    try {
      setUrl(await api.updateUrl(id, { originalUrl: destination.trim() }));
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      setSaveState('idle');
      if (err instanceof ApiError) {
        setError(err.fieldMessages || err.message);
      } else {
        setError('Could not reach the server');
      }
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!url || !stats) return <p className="error">{error || 'Not found'}</p>;

  const busiestDay = Math.max(1, ...stats.clicksByDay.map((d) => d.count));

  return (
    <div className="stack-lg">
      <Link to="/" className="muted">
        ← Back to all links
      </Link>

      <section className="card">
        <h1 className="mono">/{url.shortCode}</h1>
        <a href={url.shortUrl} target="_blank" rel="noreferrer">
          {url.shortUrl}
        </a>

        <form onSubmit={handleSave} className="create-form">
          <label className="grow">
            Destination URL
            <input
              type="url"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </section>

      <section className="card">
        <h2>Analytics</h2>

        <div className="stats">
          <div className="stat">
            <span className="stat-value">{stats.totalClicks}</span>
            <span className="muted">Total clicks</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.uniqueVisitors}</span>
            <span className="muted">Unique visitors</span>
          </div>
          <div className="stat">
            <span className="stat-value">{new Date(url.createdAt).toLocaleDateString()}</span>
            <span className="muted">Created</span>
          </div>
        </div>

        <h3>Clicks by day</h3>
        {stats.clicksByDay.length === 0 ? (
          <p className="muted">No clicks yet. Open the short link to record one.</p>
        ) : (
          <ul className="bars">
            {stats.clicksByDay.map((day) => (
              <li key={day.date}>
                <span className="bar-label mono">{day.date}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(day.count / busiestDay) * 100}%` }} />
                </span>
                <span className="numeric">{day.count}</span>
              </li>
            ))}
          </ul>
        )}

        <h3>Top referrers</h3>
        {stats.topReferrers.length === 0 ? (
          <p className="muted">No referrer data yet.</p>
        ) : (
          <ul className="plain-list">
            {stats.topReferrers.map((ref) => (
              <li key={ref.referrer}>
                <span className="truncate">{ref.referrer}</span>
                <span className="numeric">{ref.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
