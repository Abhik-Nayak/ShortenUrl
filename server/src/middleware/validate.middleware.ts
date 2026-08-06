import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest } from '../errors.js';

/** Replaces req.body with the parsed value, so controllers get typed, trimmed input. */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      next(badRequest('Request body failed validation', details));
      return;
    }

    req.body = result.data;
    next();
  };
}
