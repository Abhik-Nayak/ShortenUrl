import { app } from './app.js';
import { env } from './config/env.js';
import { closePool, one, query } from './db/pool.js';
import { ensureSchema } from './db/schema.js';

// Fail loudly at boot rather than on the first request that needs a connection.
const info = one(
  await query<{ db: string; host: string | null }>(
    'SELECT current_database() AS db, inet_server_addr()::text AS host',
  ),
);
await ensureSchema();

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`Storage:  postgres ${info.db} @ ${info.host ?? 'unknown host'}`);
});

// Drain in-flight requests and hand the pooled connections back before exiting,
// so a redeploy doesn't leave the database holding sockets open until they time out.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    console.log(`\n${signal} received — shutting down.`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  });
}
