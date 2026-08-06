import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">🔗</span> Shorten
        </Link>

        {user && (
          <nav className="topbar-actions">
            <span className="muted">{user.name ?? user.email}</span>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </nav>
        )}
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer muted">
        React · Express · JSON file store — swap in Postgres/RDS when you're ready.
      </footer>
    </div>
  );
}
