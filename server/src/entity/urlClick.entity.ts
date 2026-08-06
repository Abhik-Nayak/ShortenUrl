import { UrlClick as PrismaUrlClick } from '@prisma/client';

/** A `url_clicks` row. Backed by the Prisma model (single source of truth). */
export type UrlClick = PrismaUrlClick;

/** Input required to record a click. */
export interface CreateClickInput {
  urlId: string;
  country?: string | null;
  city?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  referrer?: string | null;
  ipHash?: string | null;
}

/** Aggregated analytics shapes returned by click queries. */
export interface DailyClickCount {
  date: string;
  count: number;
}

export interface ReferrerCount {
  referrer: string;
  count: number;
}
