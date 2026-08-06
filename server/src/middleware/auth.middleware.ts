import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../errors.js';
import { verifyToken } from '../services/auth.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    next(unauthorized('Missing Bearer token'));
    return;
  }

  try {
    req.userId = verifyToken(header.slice('Bearer '.length)).sub;
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}
