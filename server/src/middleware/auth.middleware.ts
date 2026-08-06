import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';
import { verifyToken } from '../utils/jwt';

/** Verifies the `Authorization: Bearer <jwt>` header and attaches `req.user`. */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or invalid Authorization header'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new UnauthorizedError('Authentication token is required'));
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
