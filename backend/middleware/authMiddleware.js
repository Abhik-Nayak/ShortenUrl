/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user information to requests
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("./errorHandler");

const protect = async (req, res, next) => {
  let token;

  // Get token from cookie
  if (req.cookies.token) {
    token = req.cookies.token;
  }
  // Also check Authorization header as fallback
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    req.user = user;
    req.userId = decoded.id;
    next();
  } catch (err) {
    next(new AppError("Not authorized to access this route", 401));
  }
};

// Optional authentication - doesn't fail if not authenticated
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.userId = decoded.id;
      }
    } catch (err) {
      // Silently fail, user remains not authenticated
    }
  }

  next();
};

module.exports = { protect, optionalAuth };
