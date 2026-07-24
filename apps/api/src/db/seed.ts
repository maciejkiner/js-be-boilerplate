import { adminSeeder } from "../modules/auth/auth.seed.js";
import type { Db } from "./client.js";

export interface Seeder {
  name: string;
  run(db: Db): Promise<void>;
}

/**
 * Rejestr seederów. Każdy seeder MUSI być idempotentny (upsert / `onConflictDoNothing`),
 * żeby `db:seed` dało się uruchomić wielokrotnie bez duplikatów. Scaffolder/fazy dopisują
 * seedery przy kotwicy.
 */
export const seedRegistry: Seeder[] = [
  adminSeeder,
  // scaffolder:seeds — do not remove
];

/** Uruchamia seedery po kolei. Domyślnie z rejestru; w testach można podać własne. */
export async function runSeeds(db: Db, seeders: Seeder[] = seedRegistry): Promise<void> {
  for (const seeder of seeders) {
    await seeder.run(db);
  }
}
