/**
 * User Model
 * Stores user account information, plan details, and quotas
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false, // Don't return password by default
    },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    planExpiry: {
      type: Date,
      default: null,
    },
    quotas: {
      linksPerMonth: {
        type: Number,
        default: 100, // Free plan: 100 links/month
      },
      linksUsed: {
        type: Number,
        default: 0,
      },
      analyticsRetention: {
        type: Number,
        default: 30, // Days
      },
      customDomain: {
        type: Boolean,
        default: false,
      },
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to check if monthly quota is exceeded
userSchema.methods.checkQuota = function () {
  return this.quotas.linksUsed < this.quotas.linksPerMonth;
};

// Method to increment links used this month
userSchema.methods.incrementLinksUsed = async function () {
  this.quotas.linksUsed += 1;
  await this.save();
};

// Reset monthly quota (called via scheduled job)
userSchema.methods.resetMonthlyQuota = async function () {
  this.quotas.linksUsed = 0;
  await this.save();
};

module.exports = mongoose.model("User", userSchema);
