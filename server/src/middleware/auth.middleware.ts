import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

/** Mock auth: requires a non-empty `Authorization: Bearer <token>` header. */
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

  // No DB yet — attach a mock authenticated user.
  (req as Request & { user?: { id: string; email: string } }).user = {
    id: 'usr_mock_1',
    email: 'demo@example.com',
  };

  next();
}
