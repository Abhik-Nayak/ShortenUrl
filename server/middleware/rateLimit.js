import rateLimit from "express-rate-limit";

export const createUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many URL creation requests, try again later." },
});
