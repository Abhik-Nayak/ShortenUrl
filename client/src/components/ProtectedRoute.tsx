import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Don't bounce to /login before the boot-time token check has finished.
  if (loading) return <div className="centered muted">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return <Outlet />;
}
