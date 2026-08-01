import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Db } from "./client.js";

const DEFAULT_MIGRATIONS_FOLDER = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle",
);

/**
 * Applies the generated migrations. While there are none it behaves as a no-op — which keeps the
 * pipeline wired up and callable
 * (skrypt `db:migrate`, CI, testy, start aplikacji) od teraz.
 */
export async function runMigrations(
  db: Db,
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): Promise<void> {
  const journal = path.join(migrationsFolder, "meta", "_journal.json");
  if (!existsSync(journal)) {
    return;
  }
  await migrate(db, { migrationsFolder });
}
