import { parseEnv } from "../../config/env.js";
import { createDb } from "../client.js";
import { runSeeds } from "../seed.js";

const env = parseEnv();
const { db, pool } = createDb(env.DATABASE_URL);

try {
  await runSeeds(db);
  console.log("Seedy: wykonane.");
} finally {
  await pool.end();
}
