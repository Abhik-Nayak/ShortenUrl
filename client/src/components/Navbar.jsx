import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">ShortenURL</Link>
        <div className="navbar-right">
          <button className="theme-toggle" onClick={toggle} title="Toggle dark mode">
            {dark ? '☀️' : '🌙'}
          </button>
          {user && (
            <>
              <Link to="/" className="navbar-link">Dashboard</Link>
              <span className="navbar-user">{user.name || user.email}</span>
              <button className="btn btn-logout" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
