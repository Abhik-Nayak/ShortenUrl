import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Url, UrlAnalytics } from '../api/types'

export default function UrlDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [url, setUrl] = useState<Url | null>(null)
  const [analytics, setAnalytics] = useState<UrlAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [originalUrl, setOriginalUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, a] = await Promise.all([api.getUrl(id), api.getAnalytics(id)])
      setUrl(u)
      setAnalytics(a)
      setOriginalUrl(u.originalUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load URL')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    try {
      const updated = await api.updateUrl(id, {
        originalUrl,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      })
      setUrl(updated)
      setSaveMsg('Saved.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update URL')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!confirm('Delete this short URL?')) return
    try {
      await api.deleteUrl(id)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete URL')
    }
  }

  if (loading) return <p className="muted">Loading…</p>
  if (error && !url) return <p className="error">{error}</p>
  if (!url) return null

  const maxDay = analytics
    ? Math.max(1, ...analytics.clicksByDay.map((d) => d.count))
    : 1

  return (
    <div className="stack">
      <button className="btn-link" onClick={() => navigate('/')}>
        ← Back
      </button>

      <section className="card">
        <h2>
          <a href={url.shortUrl} target="_blank" rel="noreferrer">
            /{url.shortCode}
          </a>
        </h2>
        <dl className="meta">
          <div>
            <dt>Short URL</dt>
            <dd>{url.shortUrl}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(url.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>
              {url.expiresAt
                ? new Date(url.expiresAt).toLocaleString()
                : 'Never'}
            </dd>
          </div>
          <div>
            <dt>Clicks</dt>
            <dd>{url.clicks}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2>Edit</h2>
        <form onSubmit={onSave} className="create-form">
          <label>
            Original URL
            <input
              type="url"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </label>
          <label>
            Expires at (optional)
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          {saveMsg && <p className="success">{saveMsg}</p>}
          <div className="row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn-danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </form>
      </section>

      {analytics && (
        <section className="card">
          <h2>Analytics</h2>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{analytics.totalClicks}</span>
              <span className="stat-label">Total clicks</span>
            </div>
            <div className="stat">
              <span className="stat-value">{analytics.uniqueVisitors}</span>
              <span className="stat-label">Unique visitors</span>
            </div>
          </div>

          <h3>Clicks by day</h3>
          <div className="bars">
            {analytics.clicksByDay.map((d) => (
              <div className="bar-row" key={d.date}>
                <span className="bar-label">{d.date}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(d.count / maxDay) * 100}%` }}
                  />
                </div>
                <span className="bar-count">{d.count}</span>
              </div>
            ))}
          </div>

          <h3>Top referrers</h3>
          <ul className="referrers">
            {analytics.topReferrers.map((r) => (
              <li key={r.referrer}>
                <span>{r.referrer}</span>
                <span>{r.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
