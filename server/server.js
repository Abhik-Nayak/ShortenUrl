import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import urlRoutes, { redirectHandler } from "./routes/urlRoutes.js";

const app = express();

await connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/url", urlRoutes);
app.get("/:shortCode", redirectHandler);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
