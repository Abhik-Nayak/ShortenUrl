/**
 * Header Component
 * Navigation header for the application
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { FiMenu, FiX, FiLogOut } from "react-icons/fi";
import toast from "react-hot-toast";

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
      setMobileMenuOpen(false);
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-blue-600">ShortenURL</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6 items-center">
          {!isAuthenticated ? (
            <>
              <Link to="/pricing" className="text-gray-700 hover:text-blue-600">
                Pricing
              </Link>
              <Link
                to="/login"
                className="btn btn-secondary"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
                Dashboard
              </Link>
              <Link to="/pricing" className="text-gray-700 hover:text-blue-600">
                Pricing
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <FiLogOut /> <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-gray-50 border-t px-4 py-4 space-y-2">
          {!isAuthenticated ? (
            <>
              <Link
                to="/pricing"
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/login"
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/pricing"
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left py-2 text-gray-700 hover:text-blue-600"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

export default Header;
