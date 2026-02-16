/**
 * Plan Limit Middleware
 * Enforces plan-based rate limits and quotas
 */

const { AppError } = require("./errorHandler");
const rateLimit = require("express-rate-limit");

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

// Check plan quotas for URL creation
const checkUrlQuota = async (req, res, next) => {
  // Guest users - check basic limits
  if (!req.user) {
    // Allow 50 links per month for guests
    const MAX_GUEST_LINKS = 50;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const URL = require("../models/URL");
    const urlCount = await URL.countDocuments({
      guestId: req.guestId,
      createdAt: { $gte: startOfMonth },
    });

    if (urlCount >= MAX_GUEST_LINKS) {
      return next(new AppError("Guest limit exceeded. Please register to create more links.", 429));
    }

    return next();
  }

  // Registered users - check plan-based quotas
  if (!req.user.checkQuota()) {
    return next(
      new AppError(
        `Monthly limit exceeded. You've used ${req.user.quotas.linksUsed} of ${req.user.quotas.linksPerMonth} links. Upgrade your plan or wait for the next month.`,
        429
      )
    );
  }

  next();
};

// Check plan for analytics depth
const checkAnalyticsAccess = (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Analytics available only for registered users", 403));
  }

  // Free users get limited analytics
  if (req.user.plan === "free" && req.query.detailed === "true") {
    return next(new AppError("Detailed analytics available only in Pro plan or higher", 403));
  }

  next();
};

// Check plan for custom domains
const checkCustomDomain = (req, res, next) => {
  if (!req.user) {
    return next(new AppError("Custom domains available only for registered users", 403));
  }

  if (!req.user.quotas.customDomain) {
    return next(new AppError("Custom domains available only in Pro plan or higher", 403));
  }

  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  checkUrlQuota,
  checkAnalyticsAccess,
  checkCustomDomain,
};
