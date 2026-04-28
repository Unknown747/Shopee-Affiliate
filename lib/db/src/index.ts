import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolMax = Number(process.env.PG_POOL_MAX ?? 10);
const idleTimeoutMs = Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000);
const connectionTimeoutMs = Number(process.env.PG_CONNECT_TIMEOUT_MS ?? 5000);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idleTimeoutMillis: Number.isFinite(idleTimeoutMs) ? idleTimeoutMs : 30000,
  connectionTimeoutMillis: Number.isFinite(connectionTimeoutMs)
    ? connectionTimeoutMs
    : 5000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  console.error("[pg pool] unexpected error on idle client", err);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
