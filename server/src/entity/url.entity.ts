import { Url as PrismaUrl } from '@prisma/client';

/** A `urls` row. Backed by the Prisma model (single source of truth). */
export type Url = PrismaUrl;

/** Input required to create a short URL. */
export interface CreateUrlInput {
  userId: string;
  shortCode: string;
  longUrl: string;
  expiresAt: Date | null;
}

/** Fields that may be updated on a short URL. */
export interface UpdateUrlInput {
  longUrl?: string;
  expiresAt?: Date | null;
}
