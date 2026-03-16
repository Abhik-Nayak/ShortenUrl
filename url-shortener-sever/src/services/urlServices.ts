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
): Promise<IUrl | null> => {
  const url = await Url.findOne({ shortCode });

  if (!url) {
    return null;
  }

  url.clicks += 1;
  await url.save();

  return url;
};
