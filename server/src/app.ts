import express, { Application, Request, Response } from 'express';
import authRoutes from './routes/auth.routes';
import urlRoutes from './routes/url.routes';
import { redirect } from './controllers/redirect.controller';
import { validate } from './middleware/validation.middleware';
import { shortCodeParamSchema } from './validators/url.validator';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();
const PORT = 5000;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/urls', urlRoutes);

// Public short-link redirect (kept last so it doesn't shadow API routes).
app.get('/:shortCode', validate(shortCodeParamSchema), redirect);

// Global error handler must be registered after all routes.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
