[Home](../../README.md) › [Documentation](../README.md) › [Architecture decisions](./README.md) › ADR-0005

# ADR-0005: Entity name forms in the scaffolder, and uniqueness in the entity model

- **Status:** Accepted
- **Date:** 2026-07-30
- **Authors:** bootstrap team
- **Related:** ADR-0004 (field builders), `tools/scaffold`, `packages/schemas`, the DX pilot
  ([`docs/dx-pilot/conference.md`](../dx-pilot/conference.md))

## Context

The DX pilot reached the `TalkSpeaker` entity (talk staffing — many-to-many with attributes) and
exposed two holes that earlier entities had hidden.

**1. One string in four roles.** The scaffolder used `entity.plural` simultaneously as the Drizzle
constant name (`export const ${plural}`), the table name (`pgTable("${plural}")`), the API path
(`/api/v1/${plural}`) and the module's directory and file names. For `projects`, `tasks` and
`comments` all four forms are identical, so nobody noticed. The first multi-word entity has no correct
option: `talkSpeakers` produces the table `talkSpeakers` (camelCase next to snake_case columns, since
those were snake-cased separately by `camelToSnake`) and the path `/api/v1/talkSpeakers`, breaking the
kebab-case convention from `CLAUDE.md`; `talk-speakers` produces `export const talk-speakers = …`,
which does not compile.

**2. No uniqueness in the model.** An entity could not express `unique` in any form. The pilot needs it
in three places at once: `Event.slug` (globally), an attendee's e-mail within an event (a pair) and
the `(talkId, speakerId)` pair in the staffing table. Without it duplicates reach the database, and
the only workaround is a hand-written index in a migration — outside the single source of truth.

We also had to settle how uniqueness interacts with **soft delete**, which every table has by default.
The existing `users.email` uses a plain `.unique()`, so a soft-deleted user reserves their address
forever — behaviour we do not want to reproduce in the generator.

## Considered options

**Name forms:**

1. **Derive four forms from `plural`** — the descriptor computes `plural` (camelCase), `table`
   (snake_case), and `path` and `file` (kebab-case). Pros: multi-word entities work without the entity
   author knowing about it; the input spelling is free; single-word entities are unaffected. Cons:
   four descriptor fields instead of one — the templates must pick the right one.
2. **Require four fields on the entity** (`plural`, `tableName`, `apiPath`, …). Cons: moves the problem
   to the entity author and multiplies the chances of inconsistency.
3. **Forbid multi-word entities** (validated at generation time). Cons: `orderItem`, `userGroup` and
   `talkSpeaker` are ordinary entities — the ban would be arbitrary.

**Uniqueness:**

1. **Declaration on the entity plus a partial unique index** (`where deleted_at is null`) plus mapping
   the conflict to a 409. Pros: a single source of truth; a soft delete releases the value; the API
   returns the right status code with the field names. Cons: two declaration sites (field versus
   entity) for the single- and multi-field cases; a partial index is less obvious in a migration than
   a plain `UNIQUE`.
2. **A plain `UNIQUE`** (like `users.email`). Pros: simpler. Cons: a soft-deleted row blocks the value
   indefinitely — a trap when soft delete is the default.
3. **Validation in the service only** (check before writing). Cons: a race between the check and the
   write; the database still accepts a duplicate.

## Decision

Option 1 in both cases.

The scaffolder descriptor (`tools/scaffold/src/descriptor.ts`) splits the name into words regardless
of input spelling (`talkSpeakers`, `talk-speakers` and `talk_speakers` all give the same result) and
derives four forms: `plural` for code identifiers, `table` for the table name, `path` for API and
admin paths, and `file` for the directory and file names. `entity.name` must remain a camelCase
identifier, because the scaffolder builds the `<name>Entity` export name from it — an invalid name is
rejected with a message.

Uniqueness is declared on the entity: `.unique()` on a field (single-field) and
`unique: [["eventId", "email"]]` on the entity (composite); both end up in `entity.unique`. From each
group the scaffolder generates a **partial unique index** with `where deleted_at is null`, and the
service maps a violation to a `ConflictError` (409) naming the fields — recognising it by the
deterministic index name (`<table>_<columns>_key`) through the helper
`apps/api/src/db/unique-violation.ts`.

Along the way we settled the scope of many-to-many with attributes: a join table with its own fields
is **an ordinary entity with two relations** and is fully scaffoldable. Only the assignment UX stays
outside the generator — nested routes (`/talks/:id/speakers`) and a staffing widget on the parent's
detail page. The earlier phrasing "many-to-many with attributes is outside the generator" was
misleading and has been corrected in `tools/scaffold/README.md`.

## Consequences

- **Positive:** multi-word entities work without workarounds, and the table name matches the
  snake_case of the columns. API paths keep the kebab-case convention. Uniqueness lives in the single
  source of truth and yields a 409 instead of a 500. Soft delete no longer reserves unique values
  indefinitely.
- **Negative / costs:** the templates must consciously pick a name form — using `plural` where `table`
  or `path` belongs is a silent bug (which is why the generator tests guard it). Uniqueness has two
  declaration sites depending on the number of fields. The partial unique index is non-standard next
  to `users.email`, which stays on a plain `UNIQUE` (we are not migrating it — changing registration
  behaviour is a separate decision).
- **Impact:** `tools/scaffold` (the descriptor, every template and a new set of tests),
  `packages/schemas` (`.unique()`, `entity.unique`), `apps/api/src/db/unique-violation.ts` and
  `apps/admin/src/relation-source.ts` (kebab-case relation paths). Single-word entities generate
  **identical** code to before, which a regression test guards.

## Notes

The generated Drizzle fragment (a `pgTable` with a partial unique index) was compiled against
`drizzle-orm@0.38.4` separately, before being added to the template — the API of `pgTable`'s third
argument changed between versions (object → array) and needed confirmation.

## Related

- [ADR-0004](./ADR-0004-entity-field-builders.md) — the field builders this extends
- [`tools/scaffold`](../../tools/scaffold/README.md) — the four name forms in practice
- [`packages/schemas`](../../packages/schemas/README.md) — how uniqueness is declared
- [How to add an entity](../recipes/how-to-add-an-entity.md) — the process that relies on both

---

_An ADR is immutable. Record any change of decision as a new ADR that references this one._
