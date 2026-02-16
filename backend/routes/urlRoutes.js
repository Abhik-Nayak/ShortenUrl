/**
 * URL Routes
 * Handles URL shortening, retrieval, and manipulation
 */

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { checkUrlQuota } = require("../middleware/planMiddleware");
const urlController = require("../controllers/urlController");

/**
 * POST /api/url/create
 * Create a shortened URL (works for both authenticated users and guests)
 */
router.post(
  "/create",
  optionalAuth,
  checkUrlQuota,
  [
    body("originalUrl")
      .notEmpty()
      .withMessage("URL is required")
      .matches(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)
      .withMessage("Invalid URL format"),
    body("customAlias").optional().isLength({ min: 3 }).withMessage("Alias must be at least 3 characters"),
    body("title").optional().isLength({ max: 200 }).withMessage("Title must be less than 200 characters"),
    body("description").optional().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),
  ],
  urlController.createShortUrl
);

/**
 * GET /api/url/list
 * Get all URLs for the current user (authenticated or guest)
 */
router.get("/list", optionalAuth, urlController.listUrls);

/**
 * GET /api/url/:id
 * Get details of a specific URL
 */
router.get("/:id", optionalAuth, urlController.getUrl);

/**
 * PUT /api/url/:id
 * Update URL details
 */
router.put(
  "/:id",
  optionalAuth,
  [
    body("title").optional().isLength({ max: 200 }).withMessage("Title must be less than 200 characters"),
    body("description").optional().isLength({ max: 500 }).withMessage("Description must be less than 500 characters"),
  ],
  urlController.updateUrl
);

/**
 * DELETE /api/url/:id
 * Delete a URL
 */
router.delete("/:id", optionalAuth, urlController.deleteUrl);

module.exports = router;
