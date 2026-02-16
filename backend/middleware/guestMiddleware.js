/**
 * Guest Middleware
 * Assigns a unique guestId to guest users via httpOnly cookie
 */

const { v4: uuidv4 } = require("uuid");

const guestMiddleware = (req, res, next) => {
  // Check if user has a guestId cookie
  if (!req.cookies.guestId) {
    // Generate new guestId
    const guestId = uuidv4();

    // Set httpOnly cookie (cannot be accessed by JavaScript)
    res.cookie("guestId", guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    req.guestId = guestId;
  } else {
    req.guestId = req.cookies.guestId;
  }

  next();
};

module.exports = { guestMiddleware };
