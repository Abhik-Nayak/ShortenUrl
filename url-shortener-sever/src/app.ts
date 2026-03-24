import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import urlRoutes from "./routes/urlRoutes";
import healthRoute from "./routes/healthRoute";
import { connectRedis } from "./config/redis";
import { connectRabbitMQ } from "./config/rabbitmq";
import cors from "cors";
import createLogger from "./utils/logger";

const log = createLogger("Server");

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
    });
  });
  next();
});

app.get("/", (_req, res) => {
  res.json({ message: "URL Shortener API is running" });
});

app.use("/", healthRoute);
app.use("/", urlRoutes);
app.use("/api/urls", urlRoutes);

const startServer = async (): Promise<void> => {
  try {
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    log.info("MongoDB connected");
    await connectRedis();
    await connectRabbitMQ();

    app.listen(port, () => {
      log.info(`Server running on port ${port}`);
    });
  } catch (error) {
    log.error("Server startup failed", { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
};

void startServer();
