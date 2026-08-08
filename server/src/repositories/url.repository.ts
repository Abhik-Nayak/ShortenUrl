import { one, query, toIso } from '../db/pool.js';
import type { Url } from '../types.js';

export interface CreateUrlInput {
  userId: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
}

export interface UpdateUrlInput {
  originalUrl?: string;
  expiresAt?: string | null;
}

interface UrlRow {
  id: string;
  user_id: string;
  short_code: string;
  original_url: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const toUrl = (row: UrlRow): Url => ({
  id: row.id,
  userId: row.user_id,
  shortCode: row.short_code,
  originalUrl: row.original_url,
  expiresAt: toIso(row.expires_at),
  createdAt: toIso(row.created_at)!,
  updatedAt: toIso(row.updated_at)!,
});

export const urlRepository = {
  async findByShortCode(shortCode: string): Promise<Url | null> {
    const { rows } = await query<UrlRow>('SELECT * FROM urls WHERE short_code = $1', [shortCode]);
    return rows[0] ? toUrl(rows[0]) : null;
  },

  /** Scoped to the owner — another user's id must look like it doesn't exist. */
  async findByIdForUser(id: string, userId: string): Promise<Url | null> {
    const { rows } = await query<UrlRow>('SELECT * FROM urls WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return rows[0] ? toUrl(rows[0]) : null;
  },

  async listByUser(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: Url[]; total: number }> {
    // COUNT(*) OVER () rides along with the page, so this stays one round trip
    // instead of a separate count query.
    const { rows } = await query<UrlRow & { total: string }>(
      `SELECT *, COUNT(*) OVER () AS total
         FROM urls
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, pageSize, (page - 1) * pageSize],
    );

    // A page past the end returns no rows at all, and with them the count.
    return { rows: rows.map(toUrl), total: rows[0] ? Number(rows[0].total) : 0 };
  },

  async create(input: CreateUrlInput): Promise<Url> {
    const result = await query<UrlRow>(
      `INSERT INTO urls (user_id, short_code, original_url, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.userId, input.shortCode, input.originalUrl, input.expiresAt],
    );
    return toUrl(one(result));
  },

  async update(id: string, userId: string, patch: UpdateUrlInput): Promise<Url | null> {
    // COALESCE would collapse an explicit `expiresAt: null` (clear the expiry)
    // into "leave it alone", so each field carries a separate "was it supplied"
    // flag instead.
    const { rows } = await query<UrlRow>(
      `UPDATE urls
          SET original_url = CASE WHEN $3::boolean THEN $4 ELSE original_url END,
              expires_at   = CASE WHEN $5::boolean THEN $6::timestamptz ELSE expires_at END,
              updated_at   = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [
        id,
        userId,
        patch.originalUrl !== undefined,
        patch.originalUrl ?? null,
        patch.expiresAt !== undefined,
        patch.expiresAt ?? null,
      ],
    );
    return rows[0] ? toUrl(rows[0]) : null;
  },

  /** Clicks go with it via ON DELETE CASCADE. */
  async remove(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await query('DELETE FROM urls WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);
    return (rowCount ?? 0) > 0;
  },

  async shortCodeExists(shortCode: string): Promise<boolean> {
    const { rowCount } = await query('SELECT 1 FROM urls WHERE short_code = $1', [shortCode]);
    return (rowCount ?? 0) > 0;
  },
};
