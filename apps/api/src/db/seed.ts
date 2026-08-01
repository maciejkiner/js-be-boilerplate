import { adminSeeder } from "../modules/auth/auth.seed.js";
import type { Db } from "./client.js";

export interface Seeder {
  name: string;
  run(db: Db): Promise<void>;
}

/**
 * The seeder registry. Every seeder MUST be idempotent (an upsert or `onConflictDoNothing`) so
 * that `db:seed` can run repeatedly without creating duplicates. The scaffolder appends
 * seeders at the anchor.
 */
export const seedRegistry: Seeder[] = [
  adminSeeder,
  // scaffolder:seeds — do not remove
];

/** Runs the seeders in order. From the registry by default; tests may pass their own. */
export async function runSeeds(db: Db, seeders: Seeder[] = seedRegistry): Promise<void> {
  for (const seeder of seeders) {
    await seeder.run(db);
  }
}
