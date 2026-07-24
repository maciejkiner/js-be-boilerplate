import { createDb } from "../client.js";
import { runMigrations } from "../migrate.js";

// CLI migracji potrzebuje wyłącznie DATABASE_URL (bez pełnej walidacji env aplikacji).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL jest wymagane.");
  process.exit(1);
}

const { db, pool } = createDb(databaseUrl);
try {
  await runMigrations(db);
  console.log("Migracje: zaaplikowane (lub brak do zaaplikowania).");
} finally {
  await pool.end();
}
