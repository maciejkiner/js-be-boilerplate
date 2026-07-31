[Home](../../README.md) › [Documentation](../../docs/README.md) › tools/scaffold

# tools/scaffold

The entity scaffolder: from an entity in `@repo/schemas` (the single source of truth) it generates the
derived layers — the Drizzle table, the API module, the `api-react` hooks, the admin views and a CRUD
test — and registers them at anchors (`// scaffolder:… — do not remove`). No AST parsing, no clever
merging (specification, section 6).

## Usage

```bash
# 1. Write the entity (the single source of truth) and export it from packages/schemas/src/index.ts:
#    packages/schemas/src/<name>/<name>.entity.ts  (defineEntity: Zod schema + metadata)

# 2. Generate the rest (the @repo/schemas package is built automatically first):
pnpm scaffold <name>          # e.g. pnpm scaffold invoice

# 3. Afterwards (the CLI prints these):
pnpm --filter @repo/api db:generate   # migration from the schema
pnpm generate:client                  # client from OpenAPI
```

> The scaffolder reads the entity from the compiled `dist` of `@repo/schemas`, which is why the
> `scaffold` script **builds that package automatically** (just as `db:generate` does for
> drizzle-kit) — you do not have to remember to run `build`.

## What it generates

| Layer     | File                                           | Registration (anchor)                                       |
| --------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Drizzle   | `apps/api/src/modules/<file>/<file>.schema.ts` | `db/schema.ts` (`schema-export`)                            |
| API       | `<file>.{dto,repository,service,routes}.ts`    | `modules/index.ts` (`entities-import`, `entities-register`) |
| api-react | `packages/api-react/src/<file>.ts`             | `api-react/src/index.ts` (`hooks-export`)                   |
| admin     | `apps/admin/src/entities/<file>.tsx`           | `registry.ts` (`admin-import`, `admin-entities`)            |
| test      | `apps/api/test/<file>.test.ts`                 | — (a file)                                                  |

The `control` → Drizzle/Zod/component mapping comes from the metadata; `required` from
`schema.isOptional()`; sorting and filters from `fields[].list`; uniqueness from `entity.unique`.
Generated files are formatted with Prettier immediately.

Two things to keep in mind when extending the templates:

- **`select` and `radio` are the same closed list** — only the frontend component differs. In the
  database, the DTOs, the filters and the admin columns they behave identically, so the templates ask
  the `isChoiceField()` predicate rather than comparing against `"select"`.
- **Imports in generated code must be conditional.** `noUnusedLocals` treats an unused import as an
  error, and symbols such as `formatDate`, `Badge` or `Select` only appear for some entities (a `date`
  field, a closed list, a closed-list filter respectively).

## Entity name forms

An entity's `plural` is used in four different roles, and **they do not share a spelling
convention**. The descriptor derives all four from one string, so multi-word entities work without
workarounds (write `talkSpeakers`, `talk-speakers` or `talk_speakers` — the result is the same):

| Role                                | Form         | Example         |
| ----------------------------------- | ------------ | --------------- |
| Code identifiers (`d.plural`)       | `camelCase`  | `talkSpeakers`  |
| Database table name (`d.table`)     | `snake_case` | `talk_speakers` |
| API and admin path (`d.path`)       | `kebab-case` | `talk-speakers` |
| Directory and file names (`d.file`) | `kebab-case` | `talk-speakers` |

For single-word entities all four forms are identical, which is why `projects`, `tasks` and
`comments` never noticed the difference. The entity `name` must be a valid camelCase identifier (the
scaffolder builds the `<name>Entity` export name from it) — otherwise generation is rejected with a
message.

## Rules and limitations

- It **never overwrites** existing files (it refuses). Anchor registrations are **idempotent**
  (deduplicated by a stable key). To regenerate: delete the generated files and remove the anchor
  entries.
- **Scope:** one-to-many — yes (uuid + references + `assertRelations` + `RelationSource`). Soft delete
  and audit columns — by default. Uniqueness (single- and multi-field) — yes, as a **partial** unique
  index (`where deleted_at is null`) plus a 409 carrying the field list in `errors`
  (`uniqueConflictError`), which the form turns into an error next to the control. Upload and
  full-text search — out of scope.
- **Many-to-many with attributes:** a join table with its own fields is **a normal entity** with two
  relations — scaffold it as usual and you get the data layer, CRUD and views. The generator does
  **not** produce nested routes (`/talks/:id/speakers`) or an assignment widget on the parent's detail
  page; add those by hand if that is the UX you need.
- The generated CRUD test creates prerequisites for relations to `project`/`user`; for more exotic
  relations, adjust the test manually.

## Related

- [How to add an entity](../../docs/recipes/how-to-add-an-entity.md) — the end-to-end recipe
- [`packages/schemas`](../../packages/schemas/README.md) — the input this generator reads
- [ADR-0005](../../docs/adr/ADR-0005-entity-name-forms-and-uniqueness.md) — name forms and uniqueness
- [`apps/api`](../../apps/api/README.md), [`apps/admin`](../../apps/admin/README.md) — where the output lands
