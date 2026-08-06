import { z } from 'zod';

/** Only http(s) — otherwise the redirect becomes a javascript:/data: vector. */
const httpUrl = z
  .url('Must be a valid URL')
  .max(2048, 'URL is too long')
  .refine((value) => /^https?:\/\//i.test(value), 'URL must start with http:// or https://');

const alias = z
  .string()
  .trim()
  .min(3, 'Alias must be at least 3 characters')
  .max(32, 'Alias must be at most 32 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'Alias may only contain letters, numbers, hyphens and underscores');

const futureDate = z
  .iso.datetime({ message: 'Must be an ISO 8601 datetime' })
  .refine((value) => new Date(value).getTime() > Date.now(), 'Expiry must be in the future');

export const createUrlSchema = z.object({
  originalUrl: httpUrl,
  customAlias: alias.optional(),
  expiresAt: futureDate.nullish(),
});

export const updateUrlSchema = z
  .object({
    originalUrl: httpUrl.optional(),
    expiresAt: futureDate.nullish(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

export type CreateUrlInput = z.infer<typeof createUrlSchema>;
export type UpdateUrlInput = z.infer<typeof updateUrlSchema>;
