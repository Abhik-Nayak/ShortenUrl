import { one, query, toIso } from '../db/pool.js';
import type { Click } from '../types.js';

interface ClickRow {
  id: string;
  url_id: string;
  clicked_at: string;
  referrer: string | null;
  user_agent: string | null;
  visitor_hash: string;
}

const toClick = (row: ClickRow): Click => ({
  id: row.id,
  urlId: row.url_id,
  clickedAt: toIso(row.clicked_at)!,
  referrer: row.referrer,
  userAgent: row.user_agent,
  visitorHash: row.visitor_hash,
});

export const clickRepository = {
  async record(input: Omit<Click, 'id' | 'clickedAt'>): Promise<Click> {
    const result = await query<ClickRow>(
      `INSERT INTO clicks (url_id, referrer, user_agent, visitor_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.urlId, input.referrer, input.userAgent, input.visitorHash],
    );
    return toClick(one(result));
  },

  async countByUrlId(urlId: string): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM clicks WHERE url_id = $1',
      [urlId],
    );
    return Number(one(result).count);
  },

  /** One lookup for a whole page of urls, so listing isn't N queries. */
  async countsByUrlIds(urlIds: string[]): Promise<Map<string, number>> {
    const counts = new Map(urlIds.map((id) => [id, 0]));
    if (urlIds.length === 0) return counts;

    const { rows } = await query<{ url_id: string; count: string }>(
      `SELECT url_id, COUNT(*) AS count
         FROM clicks
        WHERE url_id = ANY($1::uuid[])
        GROUP BY url_id`,
      [urlIds],
    );

    // Urls with no clicks never come back from a GROUP BY, so the zeroes seeded
    // above are what keeps every requested id present in the result.
    for (const row of rows) counts.set(row.url_id, Number(row.count));
    return counts;
  },

  async listByUrlId(urlId: string): Promise<Click[]> {
    const { rows } = await query<ClickRow>(
      'SELECT * FROM clicks WHERE url_id = $1 ORDER BY clicked_at',
      [urlId],
    );
    return rows.map(toClick);
  },
};
