import fs from 'node:fs';
import pg from 'pg';
import type { QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

/**
 * Return DATE/TIMESTAMP columns as raw strings instead of JS `Date`s.
 *
 * Everything above the repository layer types timestamps as ISO strings and
 * calls string methods on them (`clickedAt.slice(0, 10)`,
 * `createdAt.localeCompare(...)`). Parsing to `Date` here would hand those call
 * sites an object and break them at runtime, not at compile time — so the
 * mapping happens once, here, and `toIso` below normalises the shape.
 */
for (const oid of [types.builtins.TIMESTAMP, types.builtins.TIMESTAMPTZ, types.builtins.DATE]) {
  types.setTypeParser(oid, (value: string) => value);
}

/**
 * The connection crosses the public internet, so TLS is verified against the
 * provider's CA rather than blindly trusted.
 *
 * Supabase signs its database certificates with a private root that is not in
 * the system trust store, so `rejectUnauthorized: true` alone would fail —
 * the CA file is what makes verification possible at all. Without it we still
 * encrypt but cannot authenticate the server, which `config/env.ts` refuses to
 * let happen silently in production.
 */
function sslConfig(): pg.ConnectionConfig['ssl'] {
  if (!env.dbSsl) return false;

  if (!env.dbCaCert) {
    console.warn('[db] DATABASE_CA_CERT is unset — TLS is on but the server is not verified.');
    return { rejectUnauthorized: false };
  }

  return { ca: fs.readFileSync(env.dbCaCert, 'utf8'), rejectUnauthorized: true };
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: sslConfig(),
  max: env.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// An idle client erroring (server restart, pooler drop, network blip) emits on the
// pool. Without a listener Node treats it as an unhandled 'error' event and
// kills the process; pg discards the broken client and reconnects on its own.
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

/**
 * Unwrap a statement that must produce exactly one row — `INSERT ... RETURNING`
 * and aggregates like `COUNT(*)`. Turns a silent `undefined` into a loud error
 * at the point the assumption breaks.
 */
export function one<T extends QueryResultRow>(result: QueryResult<T>): T {
  const row = result.rows[0];
  if (!row) throw new Error('Expected exactly one row, got none');
  return row;
}

/** Timestamps leave the database as strings; normalise them to ISO-8601. */
export function toIso(value: string | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

export async function closePool(): Promise<void> {
  await pool.end();
}
