import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { conflict, notFound } from '../errors.js';
import { clickRepository } from '../repositories/click.repository.js';
import { urlRepository } from '../repositories/url.repository.js';
import type { Url, UrlResponse } from '../types.js';
import type { CreateUrlInput, UpdateUrlInput } from '../dto/url.dto.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 7;

/** Paths the app itself serves — they can't double as short codes. */
const RESERVED = new Set(['api', 'health', 'assets', 'favicon.ico', 'robots.txt']);

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    if (!(await urlRepository.shortCodeExists(code))) return code;
  }
  throw new Error('Could not generate a unique short code');
}

export function toResponse(url: Url, clickCount: number): UrlResponse {
  const { userId: _userId, ...rest } = url;
  return { ...rest, shortUrl: `${env.baseUrl}/${url.shortCode}`, clickCount };
}

export async function createUrl(userId: string, input: CreateUrlInput): Promise<UrlResponse> {
  let shortCode: string;

  if (input.customAlias) {
    if (RESERVED.has(input.customAlias.toLowerCase())) {
      throw conflict(`"${input.customAlias}" is a reserved alias`);
    }
    if (await urlRepository.shortCodeExists(input.customAlias)) {
      throw conflict(`Alias "${input.customAlias}" is already taken`);
    }
    shortCode = input.customAlias;
  } else {
    shortCode = await generateUniqueCode();
  }

  const url = await urlRepository.create({
    userId,
    shortCode,
    originalUrl: input.originalUrl,
    expiresAt: input.expiresAt ?? null,
  });

  return toResponse(url, 0);
}

export async function listUrls(userId: string, page: number, pageSize: number) {
  const { rows, total } = await urlRepository.listByUser(userId, page, pageSize);
  const counts = await clickRepository.countsByUrlIds(rows.map((r) => r.id));

  return {
    data: rows.map((row) => toResponse(row, counts.get(row.id) ?? 0)),
    page,
    pageSize,
    total,
  };
}

export async function getUrl(userId: string, id: string): Promise<UrlResponse> {
  const url = await urlRepository.findByIdForUser(id, userId);
  if (!url) throw notFound('Short URL not found');
  return toResponse(url, await clickRepository.countByUrlId(id));
}

export async function updateUrl(
  userId: string,
  id: string,
  patch: UpdateUrlInput,
): Promise<UrlResponse> {
  const url = await urlRepository.update(id, userId, patch);
  if (!url) throw notFound('Short URL not found');
  return toResponse(url, await clickRepository.countByUrlId(id));
}

export async function deleteUrl(userId: string, id: string): Promise<void> {
  if (!(await urlRepository.remove(id, userId))) throw notFound('Short URL not found');
}
