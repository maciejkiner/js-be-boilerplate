[Home](../../README.md) › [Documentation](../README.md) › [Architecture decisions](./README.md) › ADR-0004

# ADR-0004: Field builders (`f.*`) as the default way to declare an entity

- **Status:** Accepted
- **Date:** 2026-07-29
- **Authors:** bootstrap team
- **Related:** ADR-0001, `packages/schemas`, `tools/scaffold`, the DX pilot
  ([`docs/dx-pilot/conference.md`](../dx-pilot/conference.md))

## Context

An entity is the single source of truth for the database, backend and frontend validation, OpenAPI,
admin columns and forms. Until now it was declared as two independent halves: a Zod schema (`schema`)
and a companion metadata map (`fields`). TypeScript enforced parity of the **keys**, but the
**content** of both halves had to be kept consistent by hand:

- `control` and the Zod type are two declarations of the same fact. `control: "number"` next to
  `z.string()` compiled without a warning. The mismatch only surfaced at runtime, and obliquely: the
  scaffolder takes the Drizzle column type from `control`
  (`tools/scaffold/src/be-templates.ts`) and the requiredness from Zod
  (`tools/scaffold/src/descriptor.ts`) — the result was an `integer` column in the database validated
  as a string in the API.
- The values of a `select`/`radio` had to be written twice: in `z.enum([...])` and in `options[]`.
  The `task` entity had two fields declared that way.
- `packages/schemas/README.md` documented the `control` ↔ Zod type pairing table with a note saying
  "these must be consistent" — that is, an invariant the compiler does not check.

The immediate trigger was a question about ergonomics: declaring fields from editor completion,
without memorising metadata key names and the extras each control requires.

## Considered options

1. **Field-level builders (`f.*`) wired into `defineEntity`** — `fields` accepts builders and `schema`
   is derived. Pros: one declaration produces both halves, so a mismatch becomes inexpressible; `f.`
   lists the controls in the editor; enum values are written once; minimal new API surface. Cons:
   `defineEntity` gains an overload; the builders have to cover what Zod expresses directly today (an
   escape hatch is needed).
2. **Builders plus a separate entity-level chain** (`entity().labels().fields().build()`). Pros: more
   autocomplete (for example `displayField` from the field keys). Cons: a second, equally valid way to
   define an entity next to `defineEntity` — contrary to the "one convention per repository"
   principle.
3. **Runtime consistency validation** — check the `control` ↔ Zod type pairing at startup or in the
   scaffolder. Pros: little code, no API change. Cons: treats the symptom, not the cause; there are
   still two declarations to maintain and duplicated option lists; the error arrives late rather than
   in the editor.
4. **Status quo** — leave the invariant in the documentation. Cons: a trap that genuinely cost time on
   every new entity.

## Decision

We choose option 1. The `f.*` factories (`packages/schemas/src/lib/field-builder.ts`) create a field
together with its Zod schema; `defineEntity` gains an overload in which `fields` is a map of builders
and `schema` follows from them. The raw variant (your own `schema` plus metadata written out)
**stays** as a documented escape hatch for shapes the builders cannot express.

The scope is deliberately limited to a **1:1 lift** of what `FieldMeta` can express today: the result
of `defineEntity` is indistinguishable from the hand-written one, so no consumer (the scaffolder,
`forms-ui`, `api-react`) needed to change. Gaps beyond today's capabilities — a `datetime` control
(today `date` loses the time in the form) and a uniqueness declaration (`unique`) — are **outside this
ADR**; they will be settled once the DX pilot confirms their cost.

In addition: a label omitted from `.label()` is derived from the field name (`dueDate` → "Due date",
`venueId` → "Venue"). After migrating the reference entities, 1 field out of 18 still needed an
explicit label.

## Consequences

- **Positive:** a `control` ↔ Zod type mismatch is inexpressible, not merely discouraged. Closed-list
  values are written once. A field declaration is shorter (the `project` entity: 40 → 24 lines) and
  discoverable from the editor. Builders are immutable, so field definitions can be shared.
- **Negative / costs:** `defineEntity` has two variants — on incorrect use the inference message is
  longer than it would be with a single signature. The builders cover a subset of Zod; richer
  validation needs `.zod(fn)`, which is one more concept to learn. The `value → label` map relies on
  object key order, so numeric keys would reorder the options (documented).
- **Impact:** `packages/schemas` (a new file, the overload and three rewritten reference entities) and
  the documentation (the package README, `CLAUDE.md`, the entity recipe). The scaffolder, `forms-ui`
  and `api-react` — **unchanged**. The contract regression check is the absence of a new Drizzle
  migration (`db:generate`) and an empty `openapi.json` diff after `generate:client`: the database
  schema and OpenAPI both depend on `control` and requiredness, so any drift during the entity
  migration would have moved them.

## Notes

The 1:1 lift is proven automatically in `packages/schemas/test/field-builder.test.ts`: the same entity
declared both ways must produce identical `fields`, identical key order and requiredness, and a
`validation` that behaves identically.

## Related

- [ADR-0006](./ADR-0006-splitting-define-entity.md) — replaces the overload decided here with two functions
- [ADR-0005](./ADR-0005-entity-name-forms-and-uniqueness.md) — settles the uniqueness gap left open here
- [`packages/schemas`](../../packages/schemas/README.md) — the builders as documented today
- [How to add an entity](../recipes/how-to-add-an-entity.md) — the process that uses them

---

_An ADR is immutable. Record any change of decision as a new ADR that references this one._
