import { createHash } from 'node:crypto';
import { notFound } from '../errors.js';
import { clickRepository } from '../repositories/click.repository.js';
import { urlRepository } from '../repositories/url.repository.js';
import type { Url } from '../types.js';

export interface VisitContext {
  ip: string | undefined;
  userAgent: string | undefined;
  referrer: string | undefined;
}

/** Hashed rather than stored raw, so "unique visitors" doesn't mean "we kept your IP". */
function hashVisitor(ip: string | undefined, userAgent: string | undefined): string {
  return createHash('sha256').update(`${ip ?? ''}|${userAgent ?? ''}`).digest('hex').slice(0, 32);
}

const isExpired = (url: Url) => url.expiresAt !== null && new Date(url.expiresAt) <= new Date();

/** Resolves a short code to its destination and records the visit. */
export async function resolveAndRecord(shortCode: string, ctx: VisitContext): Promise<string> {
  const url = await urlRepository.findByShortCode(shortCode);
  if (!url) throw notFound('That short link does not exist');
  if (isExpired(url)) throw notFound('That short link has expired');

  await clickRepository.record({
    urlId: url.id,
    referrer: ctx.referrer ?? null,
    userAgent: ctx.userAgent ?? null,
    visitorHash: hashVisitor(ctx.ip, ctx.userAgent),
  });

  return url.originalUrl;
}

export async function getAnalytics(userId: string, urlId: string) {
  const url = await urlRepository.findByIdForUser(urlId, userId);
  if (!url) throw notFound('Short URL not found');

  const clicks = await clickRepository.listByUrlId(urlId);

  const byDay = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  const visitors = new Set<string>();

  for (const click of clicks) {
    const day = click.clickedAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    const referrer = click.referrer ?? 'direct';
    byReferrer.set(referrer, (byReferrer.get(referrer) ?? 0) + 1);

    visitors.add(click.visitorHash);
  }

  return {
    id: url.id,
    shortCode: url.shortCode,
    originalUrl: url.originalUrl,
    totalClicks: clicks.length,
    uniqueVisitors: visitors.size,
    clicksByDay: [...byDay.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    topReferrers: [...byReferrer.entries()]
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}
