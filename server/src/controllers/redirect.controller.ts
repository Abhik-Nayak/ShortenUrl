import { Request, Response } from 'express';
import { GoneError, NotFoundError } from '../utils/errors';

/**
 * GET /:shortCode  — public redirect to the original URL.
 * Triggers:
 *   shortCode "expired" -> 410 Gone (expired link)
 *   shortCode "missing" -> 404 Not Found
 *   anything else       -> 302 redirect to a mock destination
 */
export function redirect(req: Request, res: Response): void {
  const { shortCode } = req.params;

  if (shortCode === 'expired') {
    throw new GoneError('This short link has expired');
  }

  if (shortCode === 'missing') {
    throw new NotFoundError('Short link not found');
  }

  res.redirect(302, 'https://example.com/original-long-url');
}
