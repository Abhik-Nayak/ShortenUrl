/**
 * Register Page
 * Allows users to create a new account
 */

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiLock } from "react-icons/fi";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting || isLoading) {
      return;
    }

    if (!formData.name || !formData.email || !formData.password || !formData.passwordConfirm) {
      toast.error("Please fill all fields");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSubmitting(true);
      await register(formData);
      toast.success("Registration successful! Welcome!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="card">
        <h1 className="text-3xl font-bold mb-6 text-center">Create Account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block font-medium mb-2">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block font-medium mb-2">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-3 text-gray-400" />
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block font-medium mb-2">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                name="passwordConfirm"
                placeholder="••••••••"
                value={formData.passwordConfirm}
                onChange={handleChange}
                className="input pl-10"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isSubmitting ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center mt-6 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Login
          </Link>
        </p>

        {/* Terms Info */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded text-sm">
          <p className="text-gray-700">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
