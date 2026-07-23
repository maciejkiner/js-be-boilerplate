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
 * Aplikuje wygenerowane migracje. Dopóki nie ma żadnej (pierwsza powstaje w Fazie 3
 * z tabelą `users`), działa jak no-op — dzięki temu pipeline jest wpięty i wołalny
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
