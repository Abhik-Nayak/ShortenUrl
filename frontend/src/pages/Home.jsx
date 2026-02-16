/**
 * Home Page
 * Landing page with URL shortener form
 */

import React from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import URLShortenerForm from "../components/URLShortenerForm";
import { FiZap, FiBarChart2, FiLock } from "react-icons/fi";

function Home() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="py-12 text-center">
        <h1 className="text-5xl font-bold mb-4">
          Shorten your URLs in seconds
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Create short, memorable links with QR codes. Track analytics and get insights
        </p>
        {!isAuthenticated && (
          <div className="flex justify-center gap-4">
            <Link to="/register" className="btn btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link to="/pricing" className="btn btn-secondary text-lg px-8 py-3">
              View Pricing
            </Link>
          </div>
        )}
      </section>

      {/* URL Shortener Form */}
      <section className="py-8">
        <URLShortenerForm />
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose ShortenURL?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card text-center space-y-4">
            <FiZap className="text-4xl mx-auto text-blue-600" />
            <h3 className="text-xl font-bold">Lightning Fast</h3>
            <p className="text-gray-600">
              Create short links in seconds. Our optimized infrastructure ensures
              maximum speed.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card text-center space-y-4">
            <FiBarChart2 className="text-4xl mx-auto text-blue-600" />
            <h3 className="text-xl font-bold">Deep Analytics</h3>
            <p className="text-gray-600">
              Track every click with detailed analytics. Get insights on traffic
              sources and user behavior.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card text-center space-y-4">
            <FiLock className="text-4xl mx-auto text-blue-600" />
            <h3 className="text-xl font-bold">Secure & Private</h3>
            <p className="text-gray-600">
              Your data is encrypted and secure. We don't sell or share your
              information.
            </p>
          </div>
        </div>
      </section>

      {/* QR Code Feature */}
      <section className="py-12 bg-gray-100 rounded-lg px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">QR Code Generation</h2>
          <p className="text-lg text-gray-700 mb-6 text-center">
            Every short URL comes with an automatic QR code. Share it online or print it.
            Perfect for marketing materials, product packaging, and more.
          </p>
          <div className="text-center">
            <svg
              className="w-48 h-48 mx-auto"
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="200" height="200" fill="white" />
              <rect width="50" height="50" fill="black" />
              <rect width="50" height="50" x="150" fill="black" />
              <rect width="50" height="50" y="150" fill="black" />
              <circle cx="100" cy="100" r="30" fill="black" opacity="0.8" />
            </svg>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-12 bg-blue-600 text-white rounded-lg text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg mb-6">
            Create your first short URL now. No credit card required.
          </p>
          <Link to="/register" className="btn bg-white text-blue-600 hover:bg-gray-100">
            Sign Up for Free
          </Link>
        </section>
      )}
    </div>
  );
}

export default Home;
