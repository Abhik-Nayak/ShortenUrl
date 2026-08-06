import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import type { DbSchema } from '../types.js';

const EMPTY: DbSchema = { users: [], urls: [], clicks: [] };

/**
 * Tier 3, standing in for Postgres.
 *
 * The whole file is held in memory and flushed on every mutation. Writes are
 * serialised through a promise chain so two concurrent requests can't
 * read-modify-write over each other, and the flush is atomic (tmp + rename) so
 * a crash mid-write can't leave a truncated file behind.
 *
 * Fine for a single process on a laptop. It is not fine for multiple instances
 * — that's the point at which this class gets replaced by a real database.
 */
class JsonStore {
  private cache: DbSchema | null = null;
  private tail: Promise<unknown> = Promise.resolve();

  async load(): Promise<DbSchema> {
    if (this.cache) return this.cache;

    try {
      const raw = await fs.readFile(env.dataFile, 'utf8');
      const parsed = JSON.parse(raw) as Partial<DbSchema>;
      this.cache = { ...EMPTY, ...parsed };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      this.cache = structuredClone(EMPTY);
      await this.flush(this.cache);
    }

    return this.cache;
  }

  /** Read-only access to the current snapshot. */
  async read<T>(fn: (db: DbSchema) => T): Promise<T> {
    return fn(await this.load());
  }

  /** Serialised read-modify-write. The return value of `fn` is passed through. */
  async mutate<T>(fn: (db: DbSchema) => T): Promise<T> {
    const run = this.tail.then(async () => {
      const db = await this.load();
      const result = fn(db);
      await this.flush(db);
      return result;
    });

    // Keep the chain alive even if this mutation rejects.
    this.tail = run.catch(() => undefined);
    return run;
  }

  private async flush(db: DbSchema): Promise<void> {
    await fs.mkdir(path.dirname(env.dataFile), { recursive: true });
    const tmp = `${env.dataFile}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
    await fs.rename(tmp, env.dataFile);
  }
}

export const store = new JsonStore();
