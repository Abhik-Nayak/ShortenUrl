import express, { Application, Request, Response } from 'express';
import { env } from './config/env';
import { prisma } from './config/db';
import authRoutes from './routes/auth.routes';
import urlRoutes from './routes/url.routes';
import { redirect } from './controllers/redirect.controller';
import { validate } from './middleware/validation.middleware';
import { shortCodeParamSchema } from './validators/url.validator';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

// Trust the reverse proxy so req.ip reflects the real client (for click hashing).
app.set('trust proxy', true);
app.use(express.json());

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/urls', urlRoutes);

// Public short-link redirect (kept last so it doesn't shadow API routes).
app.get('/:shortCode', validate(shortCodeParamSchema), redirect);

// Global error handler must be registered after all routes.
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

export default app;
