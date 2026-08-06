import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await register(email, password, name.trim() || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldMessages || err.message);
      } else {
        setError('Could not reach the server');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1>Create an account</h1>
      <p className="muted">Free, and takes about ten seconds.</p>

      <form onSubmit={handleSubmit} className="stack">
        <label>
          Name <span className="muted">(optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <small className="muted">At least 8 characters.</small>
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
