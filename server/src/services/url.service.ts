import { env } from '../config/env';
import { PaginatedUrlsDto, UrlResponseDto } from '../dto/url.dto';
import { Url } from '../entity/url.entity';
import { ConflictError, NotFoundError } from '../utils/errors';
import { generateShortCode } from '../utils/shortcode';
import * as urlQuery from '../query/url.query';

/** Reserved words that may not be claimed as custom aliases. */
const RESERVED_ALIASES = new Set(['taken', 'admin', 'api', 'health']);

/** Retries when a randomly generated short code collides with an existing one. */
const MAX_CODE_ATTEMPTS = 5;

export function toUrlResponse(row: Url): UrlResponseDto {
  return {
    id: row.id,
    originalUrl: row.longUrl,
    shortCode: row.shortCode,
    shortUrl: `${env.baseUrl}/${row.shortCode}`,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    clicks: Number(row.clickCount),
  };
}

async function generateUniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateShortCode();
    if (!(await urlQuery.shortCodeExists(code))) {
      return code;
    }
  }
  throw new Error('Failed to generate a unique short code after several attempts');
}

export async function createUrl(
  userId: string,
  originalUrl: string,
  customAlias?: string,
  expiresAt?: string
): Promise<UrlResponseDto> {
  let shortCode: string;

  if (customAlias) {
    if (RESERVED_ALIASES.has(customAlias.toLowerCase())) {
      throw new ConflictError(`Alias '${customAlias}' is already taken`);
    }
    if (await urlQuery.shortCodeExists(customAlias)) {
      throw new ConflictError(`Alias '${customAlias}' is already taken`);
    }
    shortCode = customAlias;
  } else {
    shortCode = await generateUniqueShortCode();
  }

  const expires = expiresAt ? new Date(expiresAt) : null;

  try {
    const row = await urlQuery.create({ userId, shortCode, longUrl: originalUrl, expiresAt: expires });
    return toUrlResponse(row);
  } catch (err) {
    // Lost a race on the unique short_code between the check and the insert.
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError(`Alias '${shortCode}' is already taken`);
    }
    throw err;
  }
}

export async function listUrls(
  userId: string,
  page: number,
  pageSize: number
): Promise<PaginatedUrlsDto> {
  const offset = (page - 1) * pageSize;
  const { rows, total } = await urlQuery.listByUser(userId, pageSize, offset);
  return {
    data: rows.map(toUrlResponse),
    page,
    pageSize,
    total,
  };
}

export async function getUrl(id: string, userId: string): Promise<UrlResponseDto> {
  const row = await urlQuery.findByIdForUser(id, userId);
  if (!row) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }
  return toUrlResponse(row);
}

export async function updateUrl(
  id: string,
  userId: string,
  fields: { originalUrl?: string; expiresAt?: string }
): Promise<UrlResponseDto> {
  const row = await urlQuery.update(id, userId, {
    longUrl: fields.originalUrl,
    expiresAt: fields.expiresAt === undefined ? undefined : new Date(fields.expiresAt),
  });
  if (!row) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }
  return toUrlResponse(row);
}

export async function deleteUrl(id: string, userId: string): Promise<void> {
  const deleted = await urlQuery.softDelete(id, userId);
  if (!deleted) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }
}
