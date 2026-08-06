import 'dotenv/config';

/**
 * Centralised, validated environment configuration. Importing this module loads
 * `.env` (via dotenv) and fails fast if a required variable is missing.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  port: Number(optional('PORT', '5000')),
  baseUrl: optional('BASE_URL', 'http://localhost:5000'),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
} as const;
