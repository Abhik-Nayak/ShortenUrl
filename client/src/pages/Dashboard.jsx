import { useState, useEffect } from 'react';
import api from '../api/axios';
import UrlCard from '../components/UrlCard';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const [urls, setUrls] = useState([]);
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchUrls = async () => {
    try {
      const res = await api.get('/api/urls');
      setUrls(res.data.urls);
    } catch {
      toast.error('Failed to load URLs');
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/api/urls', { original_url: longUrl });
      const created = res.data.url;
      const fullShortUrl = `${API_URL}/${created.short_code}`;
      setShortUrl(fullShortUrl);
      setLongUrl('');
      toast.success('Short URL created!');
      fetchUrls();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create short URL');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/urls/${id}`);
      toast.success('URL deleted');
      setUrls(urls.filter((u) => u.id !== id));
    } catch {
      toast.error('Failed to delete URL');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="dashboard">
      <div className="create-section">
        <h2>Shorten a URL</h2>
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="url"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="Paste your long URL here..."
            required
          />
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Shortening...' : 'Shorten'}
          </button>
        </form>

        {shortUrl && (
          <div className="short-url-result">
            <span>{shortUrl}</span>
            <button className="btn btn-secondary" onClick={() => handleCopy(shortUrl)}>
              Copy
            </button>
          </div>
        )}
      </div>

      <div className="urls-section">
        <h2>Your URLs</h2>
        {urls.length === 0 ? (
          <p className="empty-state">No URLs yet. Create your first short URL above!</p>
        ) : (
          <div className="urls-list">
            {urls.map((url) => (
              <UrlCard
                key={url.id}
                url={url}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
