import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="nav">
        <Link to="/" className="brand">
          🔗 ShortenUrl
        </Link>
        <nav>
          {isAuthenticated ? (
            <>
              <Link to="/">Dashboard</Link>
              <span className="user">{user?.email ?? 'Signed in'}</span>
              <button className="btn-link" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}
