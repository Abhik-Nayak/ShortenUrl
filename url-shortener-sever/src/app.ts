import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import urlRoutes from "./routes/urlRoutes";
import { connectRedis } from "./config/redis";
import { connectRabbitMQ } from "./config/rabbitmq";
import cors from "cors";

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

app.get("/", (_req, res) => {
  res.json({ message: "URL Shortener API is running" });
});

app.use("/", urlRoutes);
app.use("/api/urls", urlRoutes);

const startServer = async (): Promise<void> => {
  try {
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
    await connectRedis();
    await connectRabbitMQ();

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

void startServer();
