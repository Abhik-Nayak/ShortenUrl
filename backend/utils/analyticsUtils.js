/**
 * Analytics Utility Functions
 * Extracts device, browser, and other analytics data from requests
 */

const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

/**
 * Parse request and extract analytics data
 * @param {Object} req - Express request object
 * @returns {Object} Analytics data
 */
const extractAnalyticsData = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip || req.connection.remoteAddress;

  // Parse user agent
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Get location from IP
  const geo = geoip.lookup(ip);

  // Determine device type
  let deviceType = "unknown";
  if (result.device.type === "mobile") {
    deviceType = "mobile";
  } else if (result.device.type === "tablet") {
    deviceType = "tablet";
  } else {
    deviceType = "desktop";
  }

  return {
    ip: ip,
    country: geo?.country || null,
    city: geo?.city || null,
    userAgent: userAgent,
    browser: result.browser?.name || null,
    device: deviceType,
    os: result.os?.name || null,
    referrer: req.headers.referer || null,
  };
};

/**
 * Get referrer domain from referrer URL
 * @param {string} referrer - Referrer URL
 * @returns {string} Referrer domain
 */
const getReferrerDomain = (referrer) => {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch (err) {
    return referrer;
  }
};

module.exports = {
  extractAnalyticsData,
  getReferrerDomain,
};
