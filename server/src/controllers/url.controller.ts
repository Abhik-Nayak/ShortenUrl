import type { Request, Response } from 'express';
import * as urlService from '../services/url.service.js';
import { getAnalytics } from '../services/click.service.js';
import type { CreateUrlInput, UpdateUrlInput } from '../dto/url.dto.js';

type IdRequest = Request<{ id: string }>;

function readPaging(req: Request) {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20) || 20));
  return { page, pageSize };
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await urlService.createUrl(req.userId!, req.body as CreateUrlInput));
}

export async function list(req: Request, res: Response) {
  const { page, pageSize } = readPaging(req);
  res.json(await urlService.listUrls(req.userId!, page, pageSize));
}

export async function getOne(req: IdRequest, res: Response) {
  res.json(await urlService.getUrl(req.userId!, req.params.id));
}

export async function update(req: IdRequest, res: Response) {
  res.json(await urlService.updateUrl(req.userId!, req.params.id, req.body as UpdateUrlInput));
}

export async function remove(req: IdRequest, res: Response) {
  await urlService.deleteUrl(req.userId!, req.params.id);
  res.status(204).send();
}

export async function analytics(req: IdRequest, res: Response) {
  res.json(await getAnalytics(req.userId!, req.params.id));
}
