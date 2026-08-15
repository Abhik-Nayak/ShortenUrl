import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

export default function UrlCard({ url, onDelete, onCopy }) {
  const shortUrl = `${API_URL}/${url.short_code}`;

  const truncate = (str, len = 50) =>
    str.length > len ? str.substring(0, len) + '...' : str;

  return (
    <div className="url-card">
      <div className="url-card-body">
        <div className="url-card-short">
          <a href={shortUrl} target="_blank" rel="noreferrer">
            {shortUrl}
          </a>
        </div>
        <div className="url-card-original" title={url.original_url}>
          {truncate(url.original_url)}
        </div>
        <div className="url-card-meta">
          <span className="url-card-clicks">{url.click_count ?? 0} clicks</span>
          <span className="url-card-date">
            {new Date(url.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="url-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => onCopy(shortUrl)}>
          Copy
        </button>
        <Link to={`/analytics/${url.id}`} className="btn btn-secondary btn-sm">
          Analytics
        </Link>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(url.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}
