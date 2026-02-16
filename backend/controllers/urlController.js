/**
 * URL Controller
 * Handles URL shortening, retrieval, and redirection logic
 */

const URL = require("../models/URL");
const Analytics = require("../models/Analytics");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");
const { validationResult } = require("express-validator");
const {
  generateUniqueShortCode,
  formatUrl,
  getFullShortUrl,
  isValidUrl,
} = require("../utils/urlUtils");
const { generateQRCodeBase64 } = require("../utils/qrUtils");
const { extractAnalyticsData } = require("../utils/analyticsUtils");

/**
 * Create a shortened URL
 * POST /api/url/create
 */
const createShortUrl = async (req, res, next) => {
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

    const { originalUrl, customAlias, title, description, tags } = req.body;

    // Format and validate URL
    const formattedUrl = formatUrl(originalUrl);
    if (!isValidUrl(formattedUrl)) {
      return next(new AppError("Invalid URL format", 400));
    }

    // Check quota if user is authenticated
    if (req.user) {
      if (!req.user.checkQuota()) {
        return next(
          new AppError(
            `Monthly limit exceeded. You've used ${req.user.quotas.linksUsed}/${req.user.quotas.linksPerMonth} links.`,
            429
          )
        );
      }
    }

    let shortCode;

    // Use custom alias if provided
    if (customAlias) {
      // Check if custom alias is already taken
      const existing = await URL.findOne({ customAlias });
      if (existing) {
        return next(new AppError("Custom alias already in use", 400));
      }
      shortCode = customAlias.toLowerCase();
    } else {
      // Generate unique short code
      shortCode = await generateUniqueShortCode();
    }

    // Create URL document
    const urlDoc = await URL.create({
      originalUrl: formattedUrl,
      shortCode,
      title,
      description,
      tags: tags || [],
      userId: req.user ? req.user._id : null,
      guestId: req.user ? null : req.guestId,
      customAlias: customAlias ? customAlias.toLowerCase() : null,
    });

    // Generate QR code
    const shortUrl = getFullShortUrl(shortCode);
    const qrCode = await generateQRCodeBase64(shortUrl);
    urlDoc.qrCode = qrCode;
    await urlDoc.save();

    // Increment user quota if authenticated
    if (req.user) {
      await req.user.incrementLinksUsed();
    }

    res.status(201).json({
      success: true,
      message: "Short URL created successfully",
      url: {
        _id: urlDoc._id,
        originalUrl: urlDoc.originalUrl,
        shortCode: urlDoc.shortCode,
        shortUrl,
        qrCode: urlDoc.qrCode,
        title: urlDoc.title,
        description: urlDoc.description,
        clickCount: urlDoc.clickCount,
        createdAt: urlDoc.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all URLs for authenticated user or guest
 * GET /api/url/list
 */
const listUrls = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, sortBy = "-createdAt" } = req.query;

    let query;

    if (req.user) {
      query = URL.find({ userId: req.user._id });
    } else {
      query = URL.find({ guestId: req.guestId });
    }

    // Search by title, description, or original URL
    if (search) {
      query = query.or([
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { originalUrl: new RegExp(search, "i") },
      ]);
    }

    // Sort
    query = query.sort(sortBy);

    // Pagination
    const skip = (page - 1) * limit;
    const urls = await query.skip(skip).limit(parseInt(limit));

    const total = await URL.countDocuments(
      req.user ? { userId: req.user._id } : { guestId: req.guestId }
    );

    res.status(200).json({
      success: true,
      urls: urls.map((url) => ({
        _id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: getFullShortUrl(url.shortCode),
        title: url.title,
        description: url.description,
        clickCount: url.clickCount,
        createdAt: url.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single URL details
 * GET /api/url/:id
 */
const getUrl = async (req, res, next) => {
  try {
    const url = await URL.findById(req.params.id);

    if (!url) {
      return next(new AppError("URL not found", 404));
    }

    // Check authorization
    if (req.user && url.userId.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to access this URL", 403));
    }

    if (!req.user && url.guestId !== req.guestId) {
      return next(new AppError("Not authorized to access this URL", 403));
    }

    res.status(200).json({
      success: true,
      url: {
        _id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: getFullShortUrl(url.shortCode),
        title: url.title,
        description: url.description,
        clickCount: url.clickCount,
        lastClickedAt: url.lastClickedAt,
        qrCode: url.qrCode,
        createdAt: url.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Redirect to original URL
 * GET /:shortCode
 */
const redirectUrl = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Find URL by short code
    const url = await URL.findOne({ shortCode });

    if (!url) {
      return res.status(404).json({
        success: false,
        message: "Short URL not found",
      });
    }

    // Check if URL is active
    if (!url.isActive) {
      return res.status(410).json({
        success: false,
        message: "This short URL is no longer active",
      });
    }

    // Check expiration
    if (url.expiresAt && new Date() > url.expiresAt) {
      return res.status(410).json({
        success: false,
        message: "This short URL has expired",
      });
    }

    // Increment click count
    url.clickCount += 1;
    url.lastClickedAt = new Date();
    await url.save();

    // Record analytics
    const analyticsData = extractAnalyticsData(req);
    await Analytics.create({
      urlId: url._id,
      userId: url.userId,
      guestId: url.guestId,
      ...analyticsData,
    });

    // Redirect to original URL
    res.redirect(301, url.originalUrl);
  } catch (err) {
    next(err);
  }
};

/**
 * Update URL details
 * PUT /api/url/:id
 */
const updateUrl = async (req, res, next) => {
  try {
    const { title, description, tags, isActive } = req.body;

    const url = await URL.findById(req.params.id);

    if (!url) {
      return next(new AppError("URL not found", 404));
    }

    // Check authorization
    if (req.user && url.userId.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to update this URL", 403));
    }

    if (!req.user && url.guestId !== req.guestId) {
      return next(new AppError("Not authorized to update this URL", 403));
    }

    if (title) url.title = title;
    if (description) url.description = description;
    if (tags) url.tags = tags;
    if (typeof isActive === "boolean") url.isActive = isActive;

    await url.save();

    res.status(200).json({
      success: true,
      message: "URL updated successfully",
      url: {
        _id: url._id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        shortUrl: getFullShortUrl(url.shortCode),
        title: url.title,
        description: url.description,
        clickCount: url.clickCount,
        createdAt: url.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete URL
 * DELETE /api/url/:id
 */
const deleteUrl = async (req, res, next) => {
  try {
    const url = await URL.findById(req.params.id);

    if (!url) {
      return next(new AppError("URL not found", 404));
    }

    // Check authorization
    if (req.user && url.userId.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to delete this URL", 403));
    }

    if (!req.user && url.guestId !== req.guestId) {
      return next(new AppError("Not authorized to delete this URL", 403));
    }

    await URL.findByIdAndDelete(req.params.id);

    // Delete associated analytics
    await Analytics.deleteMany({ urlId: url._id });

    res.status(200).json({
      success: true,
      message: "URL deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createShortUrl,
  listUrls,
  getUrl,
  redirectUrl,
  updateUrl,
  deleteUrl,
};
