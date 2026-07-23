import { type NodePgDatabase, drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  pool: Pool;
}

/**
 * Tworzy klienta Drizzle nad pulą pg. Zamknij pulę (`pool.end()`) po zakończeniu
 * pracy (skrypty CLI, testy). W aplikacji pula żyje przez cały czas działania procesu.
 */
export function createDb(databaseUrl: string): DbHandle {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
