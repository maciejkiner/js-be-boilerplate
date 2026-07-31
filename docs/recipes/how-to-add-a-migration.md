[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to add a migration

# Recipe: how to add and apply a migration (Drizzle)

Data layer: **Drizzle + PostgreSQL**. The schema is TypeScript code living in the modules; migrations
are _generated_ from that schema. We never write DDL by hand, except for deliberate data migrations.

## Conventions

- **Audit columns and soft delete** come from the helpers in `src/db/columns.ts`:

  ```ts
  import { pgTable, uuid, text } from "drizzle-orm/pg-core";
  import { timestamps, softDelete, createdBy } from "../../db/columns.js";

  export const products = pgTable("products", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ...timestamps, // created_at, updated_at ($onUpdate)
    ...softDelete, // deleted_at (null = active)
    ...createdBy, // created_by (user uuid)
  });
  ```

- **Reads** that skip deleted rows: `where(notDeleted(products.deletedAt))` from `src/db/query.ts`.
- **Schema registration**: add `export * from "../modules/<name>/<name>.schema.js";` at the
  `// scaffolder:schema-export` anchor in `src/db/schema.ts` (drizzle-kit reads that file).

## Steps

1. **Define or change the table** in `src/modules/<name>/<name>.schema.ts` and register it in
   `schema.ts`.
2. **Generate the migration**: `pnpm --filter @repo/api db:generate` → an SQL file plus an entry in
   `drizzle/meta`. Read the generated SQL before committing it.
3. **Apply it locally**: `pnpm --filter @repo/api db:migrate` (needs `DATABASE_URL`;
   `docker compose up -d`).
4. **Commit** the migration together with the schema change.

`db:generate` builds the packages first, because drizzle-kit reads the compiled `dist` of
`@repo/schemas` — you do not have to remember to run `build` yourself.

## Backward compatibility — expand → migrate → contract

Breaking changes are split into stages so old and new code can run side by side during the
transition:

1. **expand** — add the new thing (a nullable column, a new table) and leave the old one alone.
2. **migrate** — move or backfill the data (a separate data migration).
3. **contract** — drop the old thing only once nothing uses it any more.

Never drop or rename a column in the same step that introduces its replacement.

## Seeds

Seeders (`src/db/seed.ts`, registered at the `// scaffolder:seeds` anchor) **must be idempotent**
(`onConflictDoNothing` or an upsert) — `pnpm --filter @repo/api db:seed` is expected to run more than
once. The bootstrap ships one: the admin account used by the admin panel and the e2e suite.

## Uniqueness

Declare uniqueness on the entity (`.unique()` on a field, or `unique: [["eventId", "email"]]` for a
composite one) rather than in the table. The scaffolder turns it into a **partial** unique index
(`where deleted_at is null`, so a soft delete releases the value) and maps the violation onto a 409
that names the offending fields.

## Related

- [How to add an entity](./how-to-add-an-entity.md) — where the schema comes from in the first place
- [API module structure](./api-module-structure.md) — the layer that reads and writes these tables
- [`apps/api/README.md`](../../apps/api/README.md) — database commands
- [`CLAUDE.md`](../../CLAUDE.md) — the backward-compatibility rules this recipe implements
