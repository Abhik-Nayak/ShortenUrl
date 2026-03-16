import Url from "../models/Url.js";
import generateShortId from "../utils/generateShortId.js";
import generateQRCode from "../utils/generateQRCode.js";

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_error) {
    return false;
  }
};

const createUniqueShortCode = async () => {
  for (let i = 0; i < 10; i += 1) {
    const candidate = generateShortId();
    const exists = await Url.exists({ shortCode: candidate });
    if (!exists) {
      return candidate;
    }
  }
  throw new Error("Unable to generate unique short code");
};

export const shortenUrl = async (req, res) => {
  try {
    const { originalUrl, customAlias, expiresAt } = req.body;

    if (!originalUrl || !isValidHttpUrl(originalUrl)) {
      return res.status(400).json({ message: "Valid originalUrl is required" });
    }

    let shortCode;
    let alias = null;

    if (customAlias) {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Login required for custom alias" });
      }
      if (!req.user.isPro) {
        return res.status(403).json({ message: "Custom alias is available for Pro users" });
      }
      if (!ALIAS_REGEX.test(customAlias)) {
        return res.status(400).json({ message: "Invalid custom alias format" });
      }

      const existingAlias = await Url.findOne({ shortCode: customAlias });
      if (existingAlias) {
        return res.status(409).json({ message: "Custom alias already taken" });
      }

      shortCode = customAlias;
      alias = customAlias;
    } else {
      shortCode = await createUniqueShortCode();
    }

    let parsedExpiry;
    if (expiresAt) {
      parsedExpiry = new Date(expiresAt);
      if (Number.isNaN(parsedExpiry.getTime())) {
        return res.status(400).json({ message: "Invalid expiration date" });
      }
      if (parsedExpiry <= new Date()) {
        return res.status(400).json({ message: "Expiration must be in the future" });
      }
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const shortUrl = `${baseUrl}/${shortCode}`;
    const qrCode = await generateQRCode(shortUrl);

    const payload = {
      originalUrl,
      shortCode,
      customAlias: alias,
      qrCode,
      expiresAt: parsedExpiry,
    };

    if (req.user?.id) {
      payload.userId = req.user.id;
    } else {
      payload.guestId = req.guestId;
    }

    const created = await Url.create(payload);

    return res.status(201).json({
      message: "Short URL created",
      url: {
        _id: created._id,
        originalUrl: created.originalUrl,
        shortCode: created.shortCode,
        shortUrl,
        clickCount: created.clickCount,
        qrCode: created.qrCode,
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Short code already exists" });
    }
    return res.status(500).json({ message: "Failed to shorten URL", error: error.message });
  }
};

export const getMyUrls = async (req, res) => {
  try {
    let filter;
    if (req.user?.id) {
      filter = { userId: req.user.id };
    } else {
      filter = { guestId: req.guestId };
    }

    const rows = await Url.find(filter).sort({ createdAt: -1 }).lean();
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;

    const urls = rows.map((row) => ({
      ...row,
      shortUrl: `${baseUrl}/${row.shortCode}`,
    }));

    return res.status(200).json({ urls });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch URLs", error: error.message });
  }
};

export const deleteUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = { _id: id };

    if (req.user?.id) {
      filter.userId = req.user.id;
    } else {
      filter.guestId = req.guestId;
    }

    const deleted = await Url.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: "URL not found" });
    }

    return res.status(200).json({ message: "URL deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete URL", error: error.message });
  }
};

export const redirectToOriginal = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const urlDoc = await Url.findOne({ shortCode });
    if (!urlDoc) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    if (urlDoc.expiresAt && new Date(urlDoc.expiresAt) < new Date()) {
      return res.status(410).json({ message: "Short URL expired" });
    }

    await Url.updateOne({ _id: urlDoc._id }, { $inc: { clickCount: 1 } });

    return res.redirect(urlDoc.originalUrl);
  } catch (error) {
    return res.status(500).json({ message: "Redirect failed", error: error.message });
  }
};
