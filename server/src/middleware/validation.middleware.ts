import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Builds middleware that validates the request against a Zod schema shaped as
 * `{ body?, params?, query? }`. On failure it forwards the ZodError to the
 * global error handler, which renders a 400 with field-level details.
 */
export const validate =
  (schema: z.ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    next();
  };
