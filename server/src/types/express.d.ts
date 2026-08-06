import 'express';

/** The authenticated principal attached by `authMiddleware`. */
export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
