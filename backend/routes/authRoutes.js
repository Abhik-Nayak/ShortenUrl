/**
 * Authentication Routes
 * Handles user registration, login, logout, and profile management
 */

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/planMiddleware");
const authController = require("../controllers/authController");

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  "/register",
  authLimiter,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Invalid email"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("passwordConfirm").notEmpty().withMessage("Password confirmation is required"),
  ],
  authController.register
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Invalid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.login
);

/**
 * GET /api/auth/logout
 * Logout user
 */
router.get("/logout", authController.logout);

/**
 * GET /api/auth/me
 * Get current user profile (protected)
 */
router.get("/me", protect, authController.getMe);

/**
 * PUT /api/auth/update
 * Update user profile (protected)
 */
router.put(
  "/update",
  protect,
  [body("email").optional().isEmail().withMessage("Invalid email")],
  authController.updateProfile
);

module.exports = router;
