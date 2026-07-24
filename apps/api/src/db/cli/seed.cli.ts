import { createDb } from "../client.js";
import { runSeeds } from "../seed.js";

// CLI seedów potrzebuje wyłącznie DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL jest wymagane.");
  process.exit(1);
}

const { db, pool } = createDb(databaseUrl);
try {
  await runSeeds(db);
  console.log("Seedy: wykonane.");
} finally {
  await pool.end();
}
