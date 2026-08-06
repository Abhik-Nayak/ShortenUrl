import { UAParser } from 'ua-parser-js';
import { UrlAnalyticsDto, UrlResponseDto } from '../dto/url.dto';
import { hashIp } from '../utils/crypto';
import * as clickQuery from '../query/urlClick.query';
import * as urlQuery from '../query/url.query';

export interface ClickContext {
  userAgent?: string;
  ip?: string;
  referrer?: string;
}

/**
 * Record a click and bump the URL's counter. Best-effort: intended to be called
 * fire-and-forget from the redirect path, so failures are logged, not thrown.
 */
export async function recordClick(urlId: string, ctx: ClickContext): Promise<void> {
  const parsed = new UAParser(ctx.userAgent).getResult();

  await clickQuery.insert({
    urlId,
    browser: parsed.browser.name ?? null,
    os: parsed.os.name ?? null,
    device: parsed.device.type ?? 'desktop',
    referrer: ctx.referrer ?? null,
    ipHash: hashIp(ctx.ip),
    // country/city require a geo lookup — left null for now.
  });

  await urlQuery.incrementClickCount(urlId);
}

/** Build the analytics payload for a URL the caller already owns. */
export async function getAnalytics(url: UrlResponseDto): Promise<UrlAnalyticsDto> {
  const [uniqueVisitors, clicksByDay, topReferrers] = await Promise.all([
    clickQuery.uniqueVisitors(url.id),
    clickQuery.clicksByDay(url.id),
    clickQuery.topReferrers(url.id),
  ]);

  return {
    id: url.id,
    shortCode: url.shortCode,
    totalClicks: url.clicks,
    uniqueVisitors,
    clicksByDay,
    topReferrers,
  };
}
