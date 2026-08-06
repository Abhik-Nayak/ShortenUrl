import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  dataFile: path.resolve(serverRoot, process.env.DATA_FILE ?? 'data/db.json'),
  baseUrl: (process.env.BASE_URL ?? 'http://localhost:5000').replace(/\/$/, ''),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /**
   * Number of reverse proxies in front of the app. Behind nginx this must be 1,
   * or every visitor's `req.ip` is 127.0.0.1 and unique-visitor counts collapse
   * to one. Leave at 0 when the app is exposed directly.
   */
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
} as const;

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-me') {
  throw new Error('JWT_SECRET must be set to a real secret in production');
}
