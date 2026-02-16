/**
 * JWT Utility Functions
 * Generates and manages JWT tokens
 */

const jwt = require("jsonwebtoken");

const sendTokenResponse = (user, statusCode, req, res) => {
  // Create JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || "7d",
  });

  // Set cookie options
  const cookieOptions = {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Set cookie
  res.cookie("token", token, cookieOptions);

  // Don't return password
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    message: "Success",
    user,
    token,
  });
};

module.exports = { sendTokenResponse };
