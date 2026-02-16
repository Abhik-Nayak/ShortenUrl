/**
 * Plan Routes
 * Handles plan information and upgrades
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const planController = require("../controllers/planController");

/**
 * GET /api/plan
 * Get all available plans
 */
router.get("/", planController.getPlans);

/**
 * GET /api/plan/current
 * Get current user's plan (protected)
 */
router.get("/current", protect, planController.getCurrentPlan);

/**
 * POST /api/plan/upgrade
 * Create checkout session for plan upgrade (protected)
 */
router.post("/upgrade", protect, planController.upgradeePlan);

/**
 * POST /api/plan/webhook
 * Handle Stripe webhook
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  planController.handleStripeWebhook
);

module.exports = router;
