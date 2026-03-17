import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import Url from "./models/Url";
import urlRoutes from "./routes/urlRoutes";
import { connectRedis } from "./config/redis";
import { connectRabbitMQ } from "./config/rabbitmq";
import cors from "cors";

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

app.use(cors({
  origin: "http://localhost:3000", // Allow our Next.js UI
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "URL Shortener API is running" });
});

app.use("/", urlRoutes);
app.use("/api/urls", urlRoutes);

connectRedis();

const startServer = async (): Promise<void> => {
  try {
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
    await connectRabbitMQ();

    try {
      await Url.collection.dropIndex("shortId_1");
      console.log("Removed stale shortId index");
    } catch (error) {
      const indexError = error as { codeName?: string; message?: string };

      if (indexError.codeName !== "IndexNotFound") {
        throw error;
      }
    }

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

void startServer();
