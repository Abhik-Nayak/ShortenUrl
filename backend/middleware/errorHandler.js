/**
 * Error Handler Middleware
 * Handles errors and sends proper error responses
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Wrong MongoDB ID error
  if (err.name === "CastError") {
    err.message = `Invalid resource ID. ${err.message}`;
    err.statusCode = 400;
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.message = `${field} already exists. Please use a different value.`;
    err.statusCode = 400;
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    err.message = "Invalid token. Please login again.";
    err.statusCode = 401;
  }

  // JWT expired error
  if (err.name === "TokenExpiredError") {
    err.message = "Token expired. Please login again.";
    err.statusCode = 401;
  }

  // Validation error
  if (err.statusCode === 422) {
    err.statusCode = 422;
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
