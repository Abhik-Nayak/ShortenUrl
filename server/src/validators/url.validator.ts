import { z } from 'zod';

/** Accepts any ISO-parseable date string; kept storage-agnostic (no DB yet). */
const isoDateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Must be a valid ISO date string');

const aliasSchema = z
  .string()
  .min(3, 'Alias must be at least 3 characters')
  .max(30, 'Alias must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Alias may only contain letters, numbers, - and _');

export const createUrlSchema = z.object({
  body: z.object({
    originalUrl: z.url('originalUrl must be a valid URL'),
    customAlias: aliasSchema.optional(),
    expiresAt: isoDateString.optional(),
  }),
});

export const updateUrlSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      originalUrl: z.url('originalUrl must be a valid URL').optional(),
      expiresAt: isoDateString.optional(),
    })
    .refine((b) => b.originalUrl !== undefined || b.expiresAt !== undefined, {
      message: 'At least one field (originalUrl or expiresAt) must be provided',
    }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const shortCodeParamSchema = z.object({
  params: z.object({ shortCode: z.string().min(1) }),
});
