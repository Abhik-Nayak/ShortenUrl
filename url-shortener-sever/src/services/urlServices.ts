import { redisClient } from "../config/redis";
import Url, { IUrl } from "../models/Url";
import { encode } from "../utils/base62";

interface CreateShortUrlResult {
  isExisting: boolean;
  shortUrl: string;
  url: IUrl;
}

const getBaseUrl = (): string =>
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

export const createShortUrlService = async (
  originalUrl: string,
): Promise<CreateShortUrlResult> => {
  // check duplicate
  const existingUrl = await Url.findOne({ originalUrl });

  if (existingUrl) {
    return {
      isExisting: true,
      shortUrl: `${getBaseUrl()}/${existingUrl.shortCode}`,
      url: existingUrl,
    };
  }

  // create document first
  const newUrl = await Url.create({ originalUrl, shortCode: "temp" });

  // generate base62 short code
  const shortCode = encode(newUrl._id.toString().length + Date.now());

  newUrl.shortCode = shortCode;

  await newUrl.save();

  return {
    isExisting: false,
    shortUrl: `${getBaseUrl()}/${newUrl.shortCode}`,
    url: newUrl,
  };
};

export const getOriginalUrlByCode = async (
  shortCode: string,
): Promise<string | null> => {
  // 1️⃣ check cache
  const cachedUrl = await redisClient.get(shortCode);

  if (cachedUrl) {
    console.log("Cache hit");

    return cachedUrl;
  }

  console.log("Cache miss");

  // 2️⃣ query database
  const url = await Url.findOne({ shortCode });

  if (!url) {
    return null;
  }

  // 3️⃣ store in redis
  await redisClient.set(shortCode, url.originalUrl, {
    EX: 3600,
  });

  // 4️⃣ update click count
  url.clicks += 1;

  await url.save();

  return url.originalUrl;
};
