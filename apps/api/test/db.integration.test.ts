import { and, eq, sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createdBy, softDelete, timestamps } from "../src/db/columns.js";
import { type Db, type DbHandle, createDb } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { notDeleted } from "../src/db/query.js";
import { type Seeder, runSeeds } from "../src/db/seed.js";

// Testy integracyjne wymagają realnego Postgresa. Uruchamiają się tylko, gdy
// ustawiony jest TEST_DATABASE_URL (docker compose lokalnie, service w CI).
const url = process.env.TEST_DATABASE_URL;
const TABLE = "_probe_phase2";

const probe = pgTable(TABLE, {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});

describe.skipIf(!url)("integracja DB: audyt, soft delete, migracje, seedy", () => {
  let handle: DbHandle;
  let db: Db;

  beforeAll(async () => {
    handle = createDb(url as string);
    db = handle.db;
    await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(TABLE)}`);
    await db.execute(sql`
      CREATE TABLE ${sql.identifier(TABLE)} (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        "created_by" uuid
      )
    `);
  });

  afterAll(async () => {
    await db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(TABLE)}`);
    await handle.pool.end();
  });

  it("runMigrations jest wołalne (no-op bez wygenerowanych migracji)", async () => {
    await expect(runMigrations(db)).resolves.toBeUndefined();
  });

  it("audyt: insert ustawia created_at i updated_at", async () => {
    const rows = await db.insert(probe).values({ name: "a" }).returning();
    const row = rows[0]!;
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it("audyt: update aktualizuje updated_at ($onUpdate)", async () => {
    const inserted = (await db.insert(probe).values({ name: "b" }).returning())[0]!;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = (
      await db.update(probe).set({ name: "b2" }).where(eq(probe.id, inserted.id)).returning()
    )[0]!;
    expect(updated.updatedAt.getTime()).toBeGreaterThan(inserted.updatedAt.getTime());
  });

  it("soft delete: notDeleted() wyklucza usunięte, bez filtra są widoczne", async () => {
    const inserted = (await db.insert(probe).values({ name: "c" }).returning())[0]!;
    await db.update(probe).set({ deletedAt: new Date() }).where(eq(probe.id, inserted.id));

    const active = await db
      .select()
      .from(probe)
      .where(and(eq(probe.name, "c"), notDeleted(probe.deletedAt)));
    const all = await db.select().from(probe).where(eq(probe.name, "c"));

    expect(active).toHaveLength(0);
    expect(all).toHaveLength(1);
  });

  it("seedy: runner jest idempotentny (upsert dwukrotnie → 1 rekord)", async () => {
    const seeder: Seeder = {
      name: "probe",
      async run(database) {
        await database.insert(probe).values({ name: "seed" }).onConflictDoNothing();
      },
    };
    await runSeeds(db, [seeder]);
    await runSeeds(db, [seeder]);
    const rows = await db.select().from(probe).where(eq(probe.name, "seed"));
    expect(rows).toHaveLength(1);
  });
});
