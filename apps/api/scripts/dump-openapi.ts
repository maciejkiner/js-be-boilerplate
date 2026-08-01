import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildApp } from "../src/app.js";
import { parseEnv } from "../src/config/env.js";
import { createDb } from "../src/db/client.js";
import { NoopErrorTracker } from "../src/lib/error-tracking/noop.js";
import { MemoryMailer } from "../src/lib/mailer/memory.js";

/**
 * Dumps the OpenAPI specification (built from the routes' Zod schemas) to `apps/api/openapi.json`.
 * This is the only source of truth for the client generator (`packages/api-client`) — the file is
 * never edited by hand. It works offline: `createDb` creates a lazy pool and `buildApp` never
 * queries the database, so the dump needs no Postgres (the env values are stubs used only to
 * assemble the application).
 */
async function main(): Promise<void> {
  const env = parseEnv({
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    JWT_SECRET: "openapi-dump-placeholder-secret-min-32-chars",
  } as NodeJS.ProcessEnv);

  const { db, pool } = createDb(env.DATABASE_URL);
  const app = await buildApp({
    env,
    errorTracker: new NoopErrorTracker(),
    db,
    mailer: new MemoryMailer(),
  });
  await app.ready();

  const spec = app.swagger();
  const outPath = fileURLToPath(new URL("../openapi.json", import.meta.url));
  await writeFile(outPath, `${JSON.stringify(spec, null, 2)}\n`);

  await app.close();
  await pool.end();
  console.log(`OpenAPI zapisany: ${outPath}`);
}

void main();
