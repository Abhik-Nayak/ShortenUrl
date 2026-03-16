import { Router } from "express";
import { deleteUrl, getMyUrls, redirectToOriginal, shortenUrl } from "../controllers/urlController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";
import guestMiddleware from "../middleware/guestMiddleware.js";
import { createUrlLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/shorten", createUrlLimiter, optionalAuth, guestMiddleware, shortenUrl);
router.get("/my", optionalAuth, guestMiddleware, getMyUrls);
router.delete("/:id", optionalAuth, guestMiddleware, deleteUrl);

export const redirectHandler = redirectToOriginal;

export default router;
