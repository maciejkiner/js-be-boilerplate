import { count } from "drizzle-orm";
import { buildApp } from "./app.js";
import { type Env, parseEnv } from "./config/env.js";
import { createDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createErrorTracker } from "./lib/error-tracking/index.js";
import { createMailer } from "./lib/mailer/index.js";
import { users } from "./modules/auth/auth.schema.js";

async function main(): Promise<void> {
  let env: Env;
  try {
    env = parseEnv();
  } catch (error) {
    // The logger does not exist yet — fail fast straight to stderr.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const errorTracker = await createErrorTracker(env);
  const { db, pool } = createDb(env.DATABASE_URL);
  const mailer = createMailer(env);

  await runMigrations(db);

  const app = await buildApp({ env, errorTracker, db, mailer });
  app.addHook("onClose", async () => {
    await pool.end();
  });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  // Discoverability: with an empty users table, login fails with no readable reason. A separate try/catch —
  // this is only a hint and must never break the startup.
  try {
    const [row] = await db.select({ value: count() }).from(users);
    if ((row?.value ?? 0) === 0) {
      app.log.warn(
        "Brak użytkowników w bazie — utwórz konto admina seedem: `pnpm db:seed` (dev natywny) lub `pnpm docker:full:seed` (Docker). Domyślnie: admin@example.com / admin12345.",
      );
    }
  } catch (err) {
    app.log.debug({ err }, "Could not check the user count at startup.");
  }
}

void main();
