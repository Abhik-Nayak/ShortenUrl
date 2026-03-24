import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { redisClient } from "../config/redis";
import { isRabbitMQConnected } from "../config/rabbitmq";
import createLogger from "../utils/logger";

const router = Router();
const log = createLogger("Health");

interface ServiceStatus {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

router.get("/health", async (_req: Request, res: Response) => {
  const start = Date.now();

  const checks: Record<string, ServiceStatus> = {};

  // MongoDB
  try {
    const t = Date.now();
    const state = mongoose.connection.readyState;
    if (state !== 1) throw new Error(`readyState=${state}`);
    await mongoose.connection.db!.admin().ping();
    checks.mongodb = { status: "up", latencyMs: Date.now() - t };
  } catch (err) {
    checks.mongodb = { status: "down", error: err instanceof Error ? err.message : "Unknown" };
  }

  // Redis
  try {
    const t = Date.now();
    await redisClient.ping();
    checks.redis = { status: "up", latencyMs: Date.now() - t };
  } catch (err) {
    checks.redis = { status: "down", error: err instanceof Error ? err.message : "Unknown" };
  }

  // RabbitMQ
  try {
    const connected = isRabbitMQConnected();
    checks.rabbitmq = connected
      ? { status: "up" }
      : { status: "down", error: "Channel not initialized" };
  } catch (err) {
    checks.rabbitmq = { status: "down", error: err instanceof Error ? err.message : "Unknown" };
  }

  const allUp = Object.values(checks).every((c) => c.status === "up");
  const totalMs = Date.now() - start;

  const payload = {
    status: allUp ? "healthy" : "degraded",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    responseTimeMs: totalMs,
    services: checks,
  };

  if (!allUp) {
    log.warn("Health check degraded", { services: checks });
  }

  res.status(allUp ? 200 : 503).json(payload);
});

export default router;
