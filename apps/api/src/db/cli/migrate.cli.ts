import { parseEnv } from "../../config/env.js";
import { createDb } from "../client.js";
import { runMigrations } from "../migrate.js";

const env = parseEnv();
const { db, pool } = createDb(env.DATABASE_URL);

try {
  await runMigrations(db);
  console.log("Migracje: zaaplikowane (lub brak do zaaplikowania).");
} finally {
  await pool.end();
}
