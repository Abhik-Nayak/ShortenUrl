/**
 * Standalone schema bootstrap: `npm run db:migrate`.
 *
 * The server applies this on startup too, so this exists for the cases where
 * you want the schema without booting the API — first-time setup against a
 * fresh Supabase project, or a deploy step that runs before the app comes up.
 */
import { closePool } from './pool.js';
import { ensureSchema } from './schema.js';

try {
  await ensureSchema();
  console.log('Schema is up to date.');
} catch (err) {
  console.error('Migration failed:', (err as Error).message);
  process.exitCode = 1;
} finally {
  await closePool();
}
