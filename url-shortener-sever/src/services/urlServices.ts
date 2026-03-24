import { redisClient } from "../config/redis";
import Url, { IUrl } from "../models/Url";
import { encode } from "../utils/base62";
import { idGenerator } from "../utils/snowflake";
import { publishClickEvent } from "../config/rabbitmq";

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

  // generate robust and distributed unique id
  const uniqueId = idGenerator.nextId();
  const shortCode = encode(uniqueId);

  // create document first
  const newUrl = await Url.create({ originalUrl, shortCode });

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
    // Track click regardless of cache hit/miss
    publishClickEvent(shortCode);
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

  // 4️⃣ Push click event to Queue instead of saving to DB directly
  publishClickEvent(shortCode);

  return url.originalUrl;
};
