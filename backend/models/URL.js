/**
 * URL Model
 * Stores shortened URLs, original URLs, QR codes, and click tracking
 */

const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, "Original URL is required"],
      match: [
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
        "Please provide a valid URL",
      ],
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    qrCode: {
      type: String, // Base64 or URL to QR code image
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    guestId: {
      type: String, // For guest users, stored in cookie
      default: null,
    },
    customAlias: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // Allow null values for unique index
    },
    domain: {
      type: String,
      default: "shortenurl.app", // Can be custom domain for paid users
    },
    expiresAt: {
      type: Date,
      default: null, // Null means never expires
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient queries
urlSchema.index({ userId: 1, createdAt: -1 });
urlSchema.index({ guestId: 1, createdAt: -1 });
urlSchema.index({ shortCode: 1 });

// Method to increment click count
urlSchema.methods.incrementClick = async function () {
  this.clickCount += 1;
  this.lastClickedAt = new Date();
  await this.save();
};

module.exports = mongoose.model("URL", urlSchema);
