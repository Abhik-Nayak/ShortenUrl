import { Request, Response } from "express";
import { createShortUrlService, getOriginalUrlByCode } from "../services/urlServices";

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

    res.status(result.isExisting ? 200 : 201).json({
      message: result.isExisting ? "Short URL already exists" : "Short URL created successfully",
      data: {
        originalUrl: result.url.originalUrl,
        shortCode: result.url.shortCode,
        shortUrl: result.shortUrl
      }
    });
  } catch (error) {
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
      res.status(404).json({ message: "Short URL not found" });
      return;
    }

    res.redirect(url);
  } catch (error) {
    res.status(500).json({
      message: "Failed to redirect",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
