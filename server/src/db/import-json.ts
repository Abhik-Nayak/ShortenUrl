/**
 * One-off import of the old JSON-file store into Postgres: `npm run db:import`.
 *
 * Carries over the original ids, bcrypt hashes and timestamps, so existing
 * accounts keep working and short links keep resolving to the same codes.
 * Re-running is safe — every insert is ON CONFLICT DO NOTHING, so rows already
 * present are left exactly as they are rather than overwritten.
 *
 * Reads DATA_FILE (default data/db.json). Delete this file and the npm script
 * once the JSON store is gone for good.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, pool } from './pool.js';

interface JsonUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: string;
}
interface JsonUrl {
  id: string;
  userId: string;
  shortCode: string;
  originalUrl: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface JsonClick {
  id: string;
  urlId: string;
  clickedAt: string;
  referrer: string | null;
  userAgent: string | null;
  visitorHash: string;
}

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataFile = path.resolve(serverRoot, process.env.DATA_FILE ?? 'data/db.json');

const client = await pool.connect();

try {
  const raw = await fs.readFile(dataFile, 'utf8');
  const db = JSON.parse(raw) as {
    users?: JsonUser[];
    urls?: JsonUrl[];
    clicks?: JsonClick[];
  };

  // All or nothing: a urls insert that fails must not leave half the users
  // behind for the next run to trip over.
  await client.query('BEGIN');

  let users = 0;
  for (const u of db.users ?? []) {
    const { rowCount } = await client.query(
      `INSERT INTO users (id, email, name, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email.trim().toLowerCase(), u.name, u.passwordHash, u.createdAt],
    );
    users += rowCount ?? 0;
  }

  let urls = 0;
  for (const u of db.urls ?? []) {
    const { rowCount } = await client.query(
      `INSERT INTO urls (id, user_id, short_code, original_url, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [u.id, u.userId, u.shortCode, u.originalUrl, u.expiresAt, u.createdAt, u.updatedAt],
    );
    urls += rowCount ?? 0;
  }

  let clicks = 0;
  for (const c of db.clicks ?? []) {
    const { rowCount } = await client.query(
      `INSERT INTO clicks (id, url_id, clicked_at, referrer, user_agent, visitor_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.urlId, c.clickedAt, c.referrer, c.userAgent, c.visitorHash],
    );
    clicks += rowCount ?? 0;
  }

  await client.query('COMMIT');
  console.log(`Imported from ${dataFile}`);
  console.log(`  users:  ${users} new (${db.users?.length ?? 0} in file)`);
  console.log(`  urls:   ${urls} new (${db.urls?.length ?? 0} in file)`);
  console.log(`  clicks: ${clicks} new (${db.clicks?.length ?? 0} in file)`);
} catch (err) {
  await client.query('ROLLBACK').catch(() => undefined);

  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    console.log(`No JSON store at ${dataFile} — nothing to import.`);
  } else {
    console.error('Import failed:', (err as Error).message);
    process.exitCode = 1;
  }
} finally {
  client.release();
  await closePool();
}
