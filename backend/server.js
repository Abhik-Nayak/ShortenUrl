/**
 * Main Server File
 * Initializes Express app, connects to MongoDB, sets up middleware and routes
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Route imports
const authRoutes = require("./routes/authRoutes");
const urlRoutes = require("./routes/urlRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const planRoutes = require("./routes/planRoutes");

// Middleware imports
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { guestMiddleware } = require("./middleware/guestMiddleware");

// Initialize Express app
const app = express();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
};

connectDB();

// Middleware Setup
app.use(helmet()); // Security headers
app.use(morgan("dev")); // Request logging
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true, // Allow cookies
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));
app.use(cookieParser()); // Parse cookies

// Guest user middleware - assign guestId to all requests
app.use(guestMiddleware);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/url", urlRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/plan", planRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Redirect endpoint for short URLs
app.get("/:shortCode", require("./controllers/urlController").redirectUrl);

// 404 handler
app.use(notFoundHandler);

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
