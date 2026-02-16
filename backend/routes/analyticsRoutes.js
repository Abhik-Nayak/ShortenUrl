/**
 * Analytics Routes
 * Handles analytics data retrieval
 */

const express = require("express");
const router = express.Router();
const { optionalAuth, protect } = require("../middleware/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

/**
 * GET /api/analytics/:urlId
 * Get analytics for a specific URL
 */
router.get("/:urlId", optionalAuth, analyticsController.getUrlAnalytics);

/**
 * GET /api/analytics/dashboard
 * Get dashboard analytics (all URLs for authenticated user)
 */
router.get("/dashboard", protect, analyticsController.getDashboardAnalytics);

module.exports = router;
