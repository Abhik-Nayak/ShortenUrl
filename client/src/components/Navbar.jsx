import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-semibold text-slate-900">
          SnapLink
        </Link>

        <nav className="flex items-center gap-3">
          <Link to="/" className="text-sm text-slate-700 hover:text-slate-900">
            Home
          </Link>
          <Link to="/dashboard" className="text-sm text-slate-700 hover:text-slate-900">
            Dashboard
          </Link>
          {user ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
            >
              <Icon icon="mdi:logout" />
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
            >
              <Icon icon="mdi:google" />
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
