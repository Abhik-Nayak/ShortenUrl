import type { Request, Response } from 'express';
import { resolveAndRecord } from '../services/click.service.js';

export async function redirect(req: Request<{ shortCode: string }>, res: Response) {
  const destination = await resolveAndRecord(req.params.shortCode, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referer') ?? req.get('referrer'),
  });

  res.redirect(302, destination);
}
