import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { authRoutes } from './routes/auth.routes.js';
import { urlRoutes } from './routes/url.routes.js';
import { redirect } from './controllers/redirect.controller.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

export const app = express();

// Behind nginx this makes req.ip the real client address, not the proxy's.
if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '64kb' }));

// Actually touches the database — a health check that only proves the process
// is up will happily report "ok" while every real request fails on connect.
app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', storage: 'postgres', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      storage: 'postgres',
      error: (err as Error).message,
      uptime: process.uptime(),
    });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/urls', urlRoutes);

// Public redirect. Registered last so it can't shadow the API routes above.
app.get('/:shortCode', redirect);

app.use(notFoundHandler);
app.use(errorHandler);
