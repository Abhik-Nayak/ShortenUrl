import { useEffect, useState } from 'react';

function initialTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
  } catch {}
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function shorten(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShortUrl('');
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setShortUrl(data.shortUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header>
        <h1>ShortenUrl</h1>
        <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>
      <form onSubmit={shorten}>
        <input type="url" placeholder="Paste a long URL" required value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={loading}>{loading ? '...' : 'Shorten'}</button>
      </form>
      <div className="out">
        {shortUrl && <a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>}
        {error && <span className="err">{error}</span>}
      </div>
    </>
  );
}
