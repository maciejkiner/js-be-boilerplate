[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to add an entity

# Recipe: how to add an entity

Step by step: from a **single source of truth** (Zod schema + metadata) to a Drizzle table, a
migration, full CRUD (pagination, filters, sorting, soft delete) and OpenAPI.

The reference entities — hand-written, the pattern everything else follows — are **`Project`** and
**`Task`**. Sections 1–6 describe the process that the **scaffolder generalises**: the generator and
this recipe describe the same thing on purpose, so they cannot drift apart.

> Naming convention: the entity is singular (`project`), the path and table are plural (`projects`),
> and the files live in `apps/api/src/modules/<plural>/<plural>.{schema,dto,repository,service,routes}.ts`.

## Fast path: the scaffolder (recommended)

```bash
# 1. Write the entity (the single source of truth) and export it from packages/schemas/src/index.ts.
# 2. Generate Drizzle + the API module + api-react hooks + admin views + a CRUD test
#    (@repo/schemas is built automatically before generation):
pnpm scaffold <name>                    # e.g. pnpm scaffold invoice
# 3. Afterwards:
pnpm --filter @repo/api db:generate     # migration
pnpm generate:client                    # client from OpenAPI
```

The generator reads the entity from `@repo/schemas` and registers each layer at an anchor (no AST
parsing). Details and limitations: [`tools/scaffold/README.md`](../../tools/scaffold/README.md).
The rest of this recipe describes **what exactly** is produced — useful when you want to adjust the
result or write a layer by hand.

## 1. Schema and metadata in `packages/schemas`

An entity is a **Zod schema** (shape and validation, including cross-field rules) plus **presentation
metadata** per field. Declare fields with the **`f.*` builders**: one declaration produces both
halves, so `control` cannot drift away from the Zod type and `select` values are written once.

> **Do not declare audit fields** (`id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`) — every
> table gets them from `apps/api/src/db/columns.ts`. The scaffolder rejects an entity that declares
> them, because they would collide with the helper spreads in the Drizzle schema.

```ts
// packages/schemas/src/project/project.entity.ts
import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const projectEntity = defineEntity({
  name: "project",
  plural: "projects",
  label: "Project",
  labelPlural: "Projects",
  displayField: "name", // the label field in relation comboboxes pointing at this entity
  // CROSS-FIELD validation goes through `refine` (do not duplicate it in the metadata).
  refine: (schema) =>
    schema.refine((v) => v.endDate >= v.startDate, {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    }),
  // Labels are omitted wherever they follow from the field name (`startDate` → "Start date").
  fields: {
    name: f.text().min(1).max(200).sortable().filterable(),
    description: f.textarea().max(2000).optional().hidden(),
    status: f.select({ active: "Active", archived: "Archived" }).filterable(),
    startDate: f.date().sortable(),
    endDate: f.date().sortable(),
  },
});
```

Export the entity from `packages/schemas/src/index.ts`.

- **Controls and methods** (`.min`, `.optional`, `.sortable`, `.hidden`, `.zod`, …): see the table in
  [`packages/schemas/README.md`](../../packages/schemas/README.md). Typing `f.` in the editor lists
  every available control.
- **Relations** — `f.relation(entity, labelField)` (see `task.entity.ts`: `projectId` → `project`,
  `assigneeId` → `user`). This metadata later drives admin columns, forms and comboboxes.
- **A label** omitted from `.label()` is derived from the field name (`dueDate` → "Due date",
  `venueId` → "Venue"). Pass it explicitly only when it should read differently.
- **Uniqueness** — `.unique()` on a field, or `unique: [["eventId", "email"]]` on the entity for a
  composite one. It becomes a partial unique index (a soft delete releases the value) and a 409 on
  conflict. That 409 carries an `errors` list of field names next to `detail`, so the form highlights
  the offending control — see [How to define a form](./how-to-define-a-form.md).
- **The plural** may be written in any style (`talkSpeakers`, `talk-speakers`, `talk_speakers`) — the
  scaffolder derives the code identifiers (`camelCase`), the table name (`snake_case`) and the API
  path and file names (`kebab-case`) from it. The entity `name` must be a camelCase identifier.
- `defineEntity` also returns `entity.validation` — the schema including cross-field validation (or
  just `schema` when `refine` is not set). That is what the API uses as the create body.
- Labels (`label`, option labels) are written in **English**, like the rest of the documentation and
  the code comments. User-facing runtime strings (API messages, admin toasts) are still Polish.
- A shape the builders cannot express: use `defineEntityRaw` (your own `schema` plus a raw field
  metadata map) — the escape hatch is documented in
  [`packages/schemas/README.md`](../../packages/schemas/README.md).

## 2. The Drizzle table

A separate schema file inside the API module. Audit columns and soft delete come **from the
helpers**, never by hand. Enums are stored as `text` with `.$type<>()` so the row type lines up with
the Zod enum:

```ts
// apps/api/src/modules/projects/projects.schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").$type<"active" | "archived">().notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
```

**Relations** use `.references()` with an explicit `onDelete` policy (see `tasks.schema.ts`):
`project_id` → `projects` (`cascade`, generated → generated), `assignee_id` → `users` (`set null`,
generated → core).

Register the schema at the anchor in `apps/api/src/db/schema.ts` — **one line**:

```ts
export * from "../modules/projects/projects.schema.js";
// scaffolder:schema-export — do not remove
```

## 3. The migration

```bash
pnpm --filter @repo/api db:generate   # builds dist, then runs drizzle-kit generate
pnpm --filter @repo/api db:migrate    # apply (locally, or in CI against TEST_DATABASE_URL)
```

Migrations are **generated from the schema, never hand-written**. Breaking changes go
expand → migrate → contract (see [How to add a migration](./how-to-add-a-migration.md)).

## 4. The API module: dto → repository → service → routes

- **`*.dto.ts`** — request and response schemas **derived from the entity**, not written from
  scratch:

  ```ts
  export const CreateProjectSchema = projectEntity.validation; // includes cross-field validation
  export const UpdateProjectSchema = projectEntity.schema.partial();
  export const ProjectResponseSchema = projectEntity.schema.extend({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().uuid().nullable(),
  });
  // List query: PaginationQuerySchema.extend({ <filters>, sort, order })
  ```

- **`*.repository.ts`** — queries only, soft-delete aware (`isNull(deletedAt)` / `notDeleted()`).
  Sorting goes through an **allowlist of columns** (`SORT_COLUMNS`), never an arbitrary string.
- **`*.service.ts`** — business logic: missing rows become `NotFoundError`, related entities are
  checked (`assertRelations` → `BadRequestError`), `createdBy` is taken from the session.
- **`*.routes.ts`** — a `FastifyPluginAsyncZod`; every handler carries
  `preHandler: [app.authenticate]`; `schema.{querystring,params,body,response}` comes from the DTOs.
  The controller knows nothing about SQL.

Registration at the anchor in `apps/api/src/modules/index.ts` — **one line**:

```ts
await app.register(projectsRoutes({ db: deps.db }), { prefix: "/projects" });
// scaffolder:entities-register — do not remove
```

## 5. Tests (Vitest)

Integration tests, guarded by `describe.skipIf(!process.env.TEST_DATABASE_URL)` (see
`test/entities.test.ts`). Build the app with `buildTestApp()` and authenticate (`register` → `login`
→ the `access_token` cookie). Cover CRUD, pagination, filters and sorting, validation (400, including
the cross-field rule), soft delete (a GET after DELETE returns 404), `createdBy` taken from the
session, and relations (an existing FK plus a rejected non-existent one).

> Test files share one Postgres — `fileParallelism: false` in `vitest.config.ts` keeps them
> sequential. Without it, a `TRUNCATE` in one file would wipe another file's data.

## 6. OpenAPI

Nothing to write: it is generated from the route schemas. Check `GET /api/v1/openapi.json`.

## Outside the generator's scope (manual for now)

**Many-to-many with attributes** is scaffoldable as a normal entity with two relations, but nested
routes (`/talks/:id/speakers`) and an assignment widget on the parent's detail page are yours to
write. Full-text search is out of scope entirely. One-to-many, soft delete and audit columns are
handled by default.

## Related

- [`tools/scaffold/README.md`](../../tools/scaffold/README.md) — what the generator writes and what it refuses to
- [How to add a migration](./how-to-add-a-migration.md) — the next step after changing a schema
- [API module structure](./api-module-structure.md) — the same module, written by hand
- [How to define a form](./how-to-define-a-form.md) — what the entity gives you on the frontend
- [`packages/schemas/README.md`](../../packages/schemas/README.md) — every control and builder method
- [ADR-0004](../adr/ADR-0004-entity-field-builders.md), [ADR-0005](../adr/ADR-0005-entity-name-forms-and-uniqueness.md), [ADR-0006](../adr/ADR-0006-splitting-define-entity.md) — why entities look like this
