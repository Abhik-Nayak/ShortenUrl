import { Request, Response } from 'express';
import { GoneError, NotFoundError } from '../utils/errors';
import * as urlQuery from '../query/url.query';
import * as clickService from '../services/click.service';

/**
 * GET /:shortCode — public redirect to the original URL.
 *   unknown code   -> 404 Not Found
 *   expired link   -> 410 Gone
 *   otherwise      -> 302 redirect, then record the click asynchronously.
 */
export async function redirect(req: Request, res: Response): Promise<void> {
  const { shortCode } = req.params;

  const url = await urlQuery.findByShortCode(shortCode as string);
  if (!url) {
    throw new NotFoundError('Short link not found');
  }
  if (url.expiresAt && url.expiresAt.getTime() <= Date.now()) {
    throw new GoneError('This short link has expired');
  }

  res.redirect(302, url.longUrl);

  // Fire-and-forget: never let analytics slow down or break the redirect.
  void clickService
    .recordClick(url.id, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
      referrer: req.get('referer') ?? undefined,
    })
    .catch((err) => console.error('Failed to record click:', err));
}
