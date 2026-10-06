import pg from "pg";
import { env } from "../config/env.js";

// One shared pool per process. Each query borrows a connection and returns it.
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

pool.on("error", (err) => {
  // Errors on idle clients (e.g. the DB restarted) would otherwise crash the process.
  console.error("Unexpected Postgres pool error:", err.message);
});
