import { Request, Response } from "express";
import { createShortUrlService, getOriginalUrlByCode } from "../services/urlServices";
import createLogger from "../utils/logger";

const log = createLogger("Controller");

export const createShortUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { originalUrl } = req.body;

    if (!originalUrl) {
      res.status(400).json({ message: "originalUrl is required" });
      return;
    }

    try {
      const parsed = new URL(originalUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        res.status(400).json({ message: "Only http and https URLs are allowed" });
        return;
      }
    } catch {
      res.status(400).json({ message: "Invalid URL format" });
      return;
    }

    const result = await createShortUrlService(originalUrl);

    log.info(result.isExisting ? "Returned existing short URL" : "Created new short URL", {
      shortCode: result.url.shortCode,
    });

    res.status(result.isExisting ? 200 : 201).json({
      message: result.isExisting ? "Short URL already exists" : "Short URL created successfully",
      data: {
        originalUrl: result.url.originalUrl,
        shortCode: result.url.shortCode,
        shortUrl: result.shortUrl
      }
    });
  } catch (error) {
    log.error("Failed to create short URL", { error: error instanceof Error ? error.message : "Unknown" });
    res.status(500).json({
      message: "Failed to create short URL",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const redirectToOriginalUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shortCode } = req.params;
    const url = await getOriginalUrlByCode(shortCode as string);

    if (!url) {
      log.warn("Short URL not found", { shortCode });
      res.status(404).json({ message: "Short URL not found" });
      return;
    }

    log.debug("Redirecting", { shortCode });
    res.redirect(url);
  } catch (error) {
    log.error("Failed to redirect", { error: error instanceof Error ? error.message : "Unknown" });
    res.status(500).json({
      message: "Failed to redirect",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
