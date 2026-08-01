import { type NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  pool: Pool;
}

/**
 * Creates a Drizzle client over a pg pool. Close the pool (`pool.end()`) when the work is done
 * (CLI scripts, tests). In the application the pool lives for the whole process.
 */
export function createDb(databaseUrl: string): DbHandle {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
