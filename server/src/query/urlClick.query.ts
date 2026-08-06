import { prisma } from '../config/db';
import {
  CreateClickInput,
  DailyClickCount,
  ReferrerCount,
} from '../entity/urlClick.entity';

export async function insert(input: CreateClickInput): Promise<void> {
  await prisma.urlClick.create({
    data: {
      urlId: input.urlId,
      country: input.country ?? null,
      city: input.city ?? null,
      browser: input.browser ?? null,
      os: input.os ?? null,
      device: input.device ?? null,
      referrer: input.referrer ?? null,
      ipHash: input.ipHash ?? null,
    },
  });
}

// Analytics aggregations use $queryRaw: date bucketing / COUNT(DISTINCT) aren't
// expressible through Prisma's typed query API.

/** COUNT(DISTINCT ip_hash) — unique visitors for a URL. */
export async function uniqueVisitors(urlId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(DISTINCT ip_hash)::int AS count
    FROM url_clicks
    WHERE url_id = ${urlId}::uuid`;
  return rows[0]?.count ?? 0;
}

export function clicksByDay(urlId: string): Promise<DailyClickCount[]> {
  return prisma.$queryRaw<DailyClickCount[]>`
    SELECT to_char(date_trunc('day', clicked_at), 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS count
    FROM url_clicks
    WHERE url_id = ${urlId}::uuid
    GROUP BY 1
    ORDER BY 1`;
}

export function topReferrers(urlId: string, limit = 10): Promise<ReferrerCount[]> {
  return prisma.$queryRaw<ReferrerCount[]>`
    SELECT COALESCE(referrer, 'direct') AS referrer, COUNT(*)::int AS count
    FROM url_clicks
    WHERE url_id = ${urlId}::uuid
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}`;
}
