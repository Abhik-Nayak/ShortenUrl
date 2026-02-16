/**
 * Main App Component
 * Sets up routing and application structure
 */

import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import { Toaster } from "react-hot-toast";

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialized = useAuthStore((state) => state.initialized);
  const initAuth = useAuthStore((state) => state.initAuth);

  // Initialize auth only once on mount
  useEffect(() => {
    // Single initialization call
    initAuth();
  }, []); // Empty dependency array - only run once on mount

  // Show loading screen while initializing
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-8">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />

            {/* Auth routes - redirect if already authenticated */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
            />
            <Route
              path="/register"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
            />

            {/* Protected routes - redirect to login if not authenticated */}
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Footer />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
