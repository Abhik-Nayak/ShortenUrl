import { Request, Response } from 'express';
import {
  CreateUrlRequestDto,
  PaginatedUrlsDto,
  UpdateUrlRequestDto,
  UrlAnalyticsDto,
  UrlResponseDto,
} from '../dto/url.dto';
import { ConflictError, NotFoundError } from '../utils/errors';

const BASE_URL = 'http://localhost:5000';

/** Aliases treated as already taken (mock alias-conflict trigger). */
const RESERVED_ALIASES = ['taken', 'admin', 'api'];

/** id "missing" -> 404 not found (mock trigger for id-based routes). */
const MISSING_ID = 'missing';

function mockUrl(
  id: string,
  originalUrl: string,
  shortCode: string,
  expiresAt: string | null = null
): UrlResponseDto {
  return {
    id,
    originalUrl,
    shortCode,
    shortUrl: `${BASE_URL}/${shortCode}`,
    createdAt: new Date().toISOString(),
    expiresAt,
    clicks: 0,
  };
}

/**
 * POST /api/v1/urls
 * Trigger: customAlias in RESERVED_ALIASES -> 409 conflict.
 */
export function createUrl(req: Request, res: Response): void {
  const { originalUrl, customAlias, expiresAt } = req.body as CreateUrlRequestDto;

  if (customAlias && RESERVED_ALIASES.includes(customAlias)) {
    throw new ConflictError(`Alias '${customAlias}' is already taken`);
  }

  const shortCode = customAlias ?? 'abc123';
  res.status(201).json(mockUrl('url_mock_1', originalUrl, shortCode, expiresAt ?? null));
}

/** GET /api/v1/urls */
export function listUrls(_req: Request, res: Response): void {
  const response: PaginatedUrlsDto = {
    data: [
      mockUrl('url_mock_1', 'https://example.com', 'abc123'),
      mockUrl('url_mock_2', 'https://openai.com', 'xyz789'),
    ],
    page: 1,
    pageSize: 20,
    total: 2,
  };
  res.status(200).json(response);
}

/**
 * GET /api/v1/urls/:id
 * Trigger: id "missing" -> 404.
 */
export function getUrl(req: Request, res: Response): void {
  const id = req.params.id as string;
  if (id === MISSING_ID) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }
  res.status(200).json(mockUrl(id, 'https://example.com', 'abc123'));
}

/**
 * PUT /api/v1/urls/:id
 * Trigger: id "missing" -> 404.
 */
export function updateUrl(req: Request, res: Response): void {
  const id = req.params.id as string;
  if (id === MISSING_ID) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }

  const { originalUrl, expiresAt } = req.body as UpdateUrlRequestDto;
  res
    .status(200)
    .json(mockUrl(id, originalUrl ?? 'https://example.com', 'abc123', expiresAt ?? null));
}

/**
 * DELETE /api/v1/urls/:id
 * Trigger: id "missing" -> 404.
 */
export function deleteUrl(req: Request, res: Response): void {
  const id = req.params.id as string;
  if (id === MISSING_ID) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }
  res.status(204).send();
}

/**
 * GET /api/v1/urls/:id/analytics
 * Trigger: id "missing" -> 404.
 */
export function getAnalytics(req: Request, res: Response): void {
  const id = req.params.id as string;
  if (id === MISSING_ID) {
    throw new NotFoundError(`URL with id '${id}' not found`);
  }

  const analytics: UrlAnalyticsDto = {
    id,
    shortCode: 'abc123',
    totalClicks: 42,
    uniqueVisitors: 30,
    clicksByDay: [
      { date: '2026-07-16', count: 10 },
      { date: '2026-07-17', count: 15 },
      { date: '2026-07-18', count: 17 },
    ],
    topReferrers: [
      { referrer: 'google.com', count: 20 },
      { referrer: 'twitter.com', count: 12 },
    ],
  };

  res.status(200).json(analytics);
}
