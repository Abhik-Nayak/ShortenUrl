import { Request, Response } from 'express';
import { CreateUrlRequestDto, UpdateUrlRequestDto } from '../dto/url.dto';
import * as urlService from '../services/url.service';
import * as clickService from '../services/click.service';

/** POST /api/v1/urls */
export async function createUrl(req: Request, res: Response): Promise<void> {
  const { originalUrl, customAlias, expiresAt } = req.body as CreateUrlRequestDto;
  const url = await urlService.createUrl(req.user!.id, originalUrl, customAlias, expiresAt);
  res.status(201).json(url);
}

/** GET /api/v1/urls */
export async function listUrls(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const response = await urlService.listUrls(req.user!.id, page, pageSize);
  res.status(200).json(response);
}

/** GET /api/v1/urls/:id */
export async function getUrl(req: Request, res: Response): Promise<void> {
  const url = await urlService.getUrl(req.params.id as string, req.user!.id);
  res.status(200).json(url);
}

/** PUT /api/v1/urls/:id */
export async function updateUrl(req: Request, res: Response): Promise<void> {
  const { originalUrl, expiresAt } = req.body as UpdateUrlRequestDto;
  const url = await urlService.updateUrl(req.params.id as string, req.user!.id, {
    originalUrl,
    expiresAt,
  });
  res.status(200).json(url);
}

/** DELETE /api/v1/urls/:id */
export async function deleteUrl(req: Request, res: Response): Promise<void> {
  await urlService.deleteUrl(req.params.id as string, req.user!.id);
  res.status(204).send();
}

/** GET /api/v1/urls/:id/analytics */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const url = await urlService.getUrl(req.params.id as string, req.user!.id);
  const analytics = await clickService.getAnalytics(url);
  res.status(200).json(analytics);
}
