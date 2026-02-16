/**
 * Analytics Controller
 * Handles retrieving analytics data for URLs
 */

const Analytics = require("../models/Analytics");
const URL = require("../models/URL");
const { AppError } = require("../middleware/errorHandler");

/**
 * Get analytics for a specific URL
 * GET /api/analytics/:urlId
 */
const getUrlAnalytics = async (req, res, next) => {
  try {
    const { urlId } = req.params;
    const { startDate, endDate, limit = 100, detailed = false } = req.query;

    // Verify URL exists and user has access
    const url = await URL.findById(urlId);

    if (!url) {
      return next(new AppError("URL not found", 404));
    }

    // Check authorization
    if (req.user && url.userId.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to access this URL's analytics", 403));
    }

    if (!req.user && url.guestId !== req.guestId) {
      return next(new AppError("Not authorized to access this URL's analytics", 403));
    }

    // Check plan authorization for detailed analytics
    if (req.user && detailed === "true" && req.user.plan === "free") {
      return next(new AppError("Detailed analytics available only in Pro plan or higher", 403));
    }

    // Build query
    let query = Analytics.find({ urlId });

    if (startDate && endDate) {
      query = query.find({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      });
    } else if (req.user) {
      // Default to analytics within retention period
      const retentionDays = req.user.quotas.analyticsRetention;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      query = query.find({ timestamp: { $gte: cutoffDate } });
    }

    // Fetch analytics
    let analytics;
    if (detailed === "true") {
      // Return detailed click-by-click data
      analytics = await query.sort("-timestamp").limit(parseInt(limit));
    } else {
      // Return aggregated data
      analytics = await query;
    }

    // Calculate aggregated statistics
    const stats = {
      totalClicks: analytics.length,
      uniqueDevices: new Set(analytics.map((a) => a.device)).size,
      uniqueBrowsers: new Set(analytics.map((a) => a.browser)).size,
      uniqueCountries: new Set(analytics.map((a) => a.country)).size,
      topCountries: {},
      topBrowsers: {},
      topDevices: {},
      clicksByDay: {},
    };

    // Aggregate data
    analytics.forEach((click) => {
      // Countries
      if (click.country) {
        stats.topCountries[click.country] = (stats.topCountries[click.country] || 0) + 1;
      }

      // Browsers
      if (click.browser) {
        stats.topBrowsers[click.browser] = (stats.topBrowsers[click.browser] || 0) + 1;
      }

      // Devices
      stats.topDevices[click.device] = (stats.topDevices[click.device] || 0) + 1;

      // Clicks by day
      if (click.timestamp) {
        const day = click.timestamp.toISOString().split("T")[0];
        stats.clicksByDay[day] = (stats.clicksByDay[day] || 0) + 1;
      }
    });

    // Sort and limit aggregations
    stats.topCountries = Object.fromEntries(
      Object.entries(stats.topCountries).sort(([, a], [, b]) => b - a).slice(0, 5)
    );

    stats.topBrowsers = Object.fromEntries(
      Object.entries(stats.topBrowsers).sort(([, a], [, b]) => b - a).slice(0, 5)
    );

    stats.topDevices = Object.fromEntries(
      Object.entries(stats.topDevices).sort(([, a], [, b]) => b - a)
    );

    res.status(200).json({
      success: true,
      urlId,
      stats,
      ...(detailed === "true" && { detailedClicks: analytics }),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get dashboard analytics (all URLs)
 * GET /api/analytics/dashboard
 */
const getDashboardAnalytics = async (req, res, next) => {
  try {
    // Authenticated users only
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { startDate, endDate } = req.query;

    // Get all URLs for user
    const urls = await URL.find({ userId: req.user._id });
    const urlIds = urls.map((u) => u._id);

    // Build query
    let query = Analytics.find({ urlId: { $in: urlIds } });

    if (startDate && endDate) {
      query = query.find({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      });
    } else {
      // Default to last 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      query = query.find({ timestamp: { $gte: cutoffDate } });
    }

    const analytics = await query;

    // Calculate dashboard stats
    const stats = {
      totalLinks: urls.length,
      totalClicks: analytics.length,
      uniqueCountries: new Set(analytics.map((a) => a.country)).size,
      uniqueDevices: new Set(analytics.map((a) => a.device)).size,
      topUrls: [],
      clicksByDay: {},
    };

    // Clicks per URL
    const clicksPerUrl = {};
    analytics.forEach((click) => {
      clicksPerUrl[click.urlId.toString()] = (clicksPerUrl[click.urlId.toString()] || 0) + 1;

      // Clicks by day
      const day = click.timestamp.toISOString().split("T")[0];
      stats.clicksByDay[day] = (stats.clicksByDay[day] || 0) + 1;
    });

    // Get top URLs
    stats.topUrls = Object.entries(clicksPerUrl)
      .map(([urlId, clicks]) => {
        const url = urls.find((u) => u._id.toString() === urlId);
        return {
          urlId,
          shortCode: url.shortCode,
          title: url.title,
          clicks,
        };
      })
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUrlAnalytics,
  getDashboardAnalytics,
};
