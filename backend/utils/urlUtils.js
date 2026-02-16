/**
 * URL Shortening Utility Functions
 * Generates unique short codes and validates URLs
 */

const URL = require("../models/URL");

const CHARSET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a random short code
 * @param {number} length - Length of the short code
 * @returns {string} Random short code
 */
const generateShortCode = (length = 6) => {
  let shortCode = "";
  for (let i = 0; i < length; i++) {
    shortCode += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return shortCode;
};

/**
 * Generate a unique short code (checks database)
 * @returns {Promise<string>} Unique short code
 */
const generateUniqueShortCode = async () => {
  let shortCode;
  let isUnique = false;

  // Retry until unique code is found
  while (!isUnique) {
    shortCode = generateShortCode(6);
    const existing = await URL.findOne({ shortCode });
    if (!existing) {
      isUnique = true;
    }
  }

  return shortCode;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Format URL with protocol if missing
 * @param {string} url - URL to format
 * @returns {string} Formatted URL
 */
const formatUrl = (url) => {
  if (!url.match(/^https?:\/\//)) {
    return "https://" + url;
  }
  return url;
};

/**
 * Get full short URL
 * @param {string} shortCode - Short code
 * @param {string} domain - Domain name
 * @returns {string} Full short URL
 */
const getFullShortUrl = (shortCode, domain = "shortenurl.app") => {
  return `${process.env.BASE_URL || "http://localhost:5000"}/${shortCode}`;
};

module.exports = {
  generateShortCode,
  generateUniqueShortCode,
  isValidUrl,
  formatUrl,
  getFullShortUrl,
};
