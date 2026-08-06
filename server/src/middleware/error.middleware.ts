import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'NotFound', message: 'Route not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: env.nodeEnv === 'production' ? 'Something went wrong' : String(err),
  });
}
