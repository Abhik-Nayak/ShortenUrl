/**
 * Analytics Model
 * Tracks detailed information about each click on a shortened URL
 */

const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
  {
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "URL",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    guestId: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    country: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    browser: {
      type: String,
      default: null,
    },
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    os: {
      type: String,
      default: null,
    },
    referrer: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

// Index for efficient queries
analyticsSchema.index({ urlId: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ guestId: 1, timestamp: -1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
