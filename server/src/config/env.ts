import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const bool = (value: string | undefined, fallback: boolean) =>
  value === undefined ? fallback : /^(1|true|yes)$/i.test(value);

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  /** Postgres connection string, e.g. postgresql://user:pass@host:5432/dbname */
  databaseUrl: required('DATABASE_URL'),
  dbSsl: bool(process.env.DATABASE_SSL, true),
  /**
   * CA used to verify the database server. Supabase signs its certificates with
   * a private root ("Supabase Root 2021 CA") that is not in the system trust
   * store, so verification only works when this points at their CA file.
   * Resolved against server/ so the same relative value works from `src` under
   * tsx and from `dist` after a build.
   */
  dbCaCert: process.env.DATABASE_CA_CERT
    ? path.resolve(serverRoot, process.env.DATABASE_CA_CERT)
    : null,
  /** Escape hatch: encrypt without verifying the server. See the check below. */
  dbSslInsecure: bool(process.env.DATABASE_SSL_INSECURE, false),
  dbPoolMax: Number(process.env.DATABASE_POOL_MAX ?? 10),

  baseUrl: (process.env.BASE_URL ?? 'http://localhost:5000').replace(/\/$/, ''),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /**
   * Number of reverse proxies in front of the app. Behind nginx this must be 1,
   * or every visitor's `req.ip` is 127.0.0.1 and unique-visitor counts collapse
   * to one. Leave at 0 when the app is exposed directly.
   */
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
} as const;

if (env.nodeEnv === 'production') {
  if (env.jwtSecret === 'dev-only-change-me') {
    throw new Error('JWT_SECRET must be set to a real secret in production');
  }
  if (!env.dbSsl) {
    throw new Error('DATABASE_SSL must not be disabled in production');
  }
  // Encryption without verification stops eavesdropping but not an attacker who
  // can answer for the database's address — and this connection crosses the
  // public internet. Opting out has to be deliberate and visible in the config.
  if (!env.dbCaCert && !env.dbSslInsecure) {
    throw new Error(
      'Set DATABASE_CA_CERT to verify the database server in production ' +
        '(or DATABASE_SSL_INSECURE=true to accept an unverified connection)',
    );
  }
}
