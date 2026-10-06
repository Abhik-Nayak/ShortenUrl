import "dotenv/config";

// Single place to read environment variables. Later stages add DATABASE_URL, REDIS_URL, etc.
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
