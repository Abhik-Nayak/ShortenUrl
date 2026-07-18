import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Url } from '../api/types'

export default function DashboardPage() {
  const [urls, setUrls] = useState<Url[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Create form state
  const [originalUrl, setOriginalUrl] = useState('')
  const [customAlias, setCustomAlias] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createDetails, setCreateDetails] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const loadUrls = async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await api.listUrls()
      setUrls(res.data)
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Failed to load URLs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUrls()
  }, [])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    setCreateDetails([])
    setCreating(true)
    try {
      const created = await api.createUrl({
        originalUrl,
        customAlias: customAlias || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      })
      setUrls((prev) => [created, ...prev])
      setOriginalUrl('')
      setCustomAlias('')
      setExpiresAt('')
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message)
        setCreateDetails(err.details)
      } else {
        setCreateError('Failed to create short URL')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>Create a short URL</h2>
        <form onSubmit={onCreate} className="create-form">
          <label>
            Original URL
            <input
              type="url"
              placeholder="https://example.com/very/long/link"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
              required
            />
          </label>
          <div className="row">
            <label>
              Custom alias (optional)
              <input
                placeholder="my-link"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
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
          </div>
          {createError && <p className="error">{createError}</p>}
          {createDetails.length > 0 && (
            <ul className="error-list">
              {createDetails.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          <button type="submit" disabled={creating}>
            {creating ? 'Shortening…' : 'Shorten'}
          </button>
          <p className="hint">
            Tip: alias <code>taken</code> triggers a 409 conflict.
          </p>
        </form>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Your URLs</h2>
          <button className="btn-link" onClick={() => void loadUrls()}>
            Refresh
          </button>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {listError && <p className="error">{listError}</p>}
        {!loading && !listError && urls.length === 0 && (
          <p className="muted">No URLs yet.</p>
        )}

        {urls.length > 0 && (
          <table className="url-table">
            <thead>
              <tr>
                <th>Short</th>
                <th>Original</th>
                <th>Clicks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {urls.map((u) => (
                <tr key={u.id}>
                  <td>
                    <a href={u.shortUrl} target="_blank" rel="noreferrer">
                      /{u.shortCode}
                    </a>
                  </td>
                  <td className="truncate" title={u.originalUrl}>
                    {u.originalUrl}
                  </td>
                  <td>{u.clicks}</td>
                  <td>
                    <Link to={`/urls/${u.id}`}>Details</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
