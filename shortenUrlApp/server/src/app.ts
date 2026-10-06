import express from "express";
import cors from "cors";
import { env } from "./config/env.js";

// app.ts builds the Express app; server.ts starts listening.
// Keeping them separate lets tests (stage 10) import the app without opening a port.
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CLIENT_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
