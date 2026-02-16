/**
 * Authentication Controller
 * Handles user registration, login, logout, and profile fetching
 */

const User = require("../models/User");
const { sendTokenResponse } = require("../utils/tokenUtils");
const { AppError } = require("../middleware/errorHandler");
const { validationResult } = require("express-validator");

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, email, password, passwordConfirm } = req.body;

    // Validate password match
    if (password !== passwordConfirm) {
      return next(new AppError("Passwords do not match", 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return next(new AppError("Email already in use", 400));
    }

    // Create new user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    // Send token response
    sendTokenResponse(user, 201, req, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    if (!user) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new AppError("Invalid email or password", 401));
    }

    // Send token response
    sendTokenResponse(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Logout user
 * GET /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user profile
 * PUT /api/auth/update
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const user = req.user;

    if (name) user.name = name;

    if (email) {
      // Check if email is already in use
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return next(new AppError("Email already in use", 400));
      }
      user.email = email.toLowerCase();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
};
