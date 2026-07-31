[Home](../../README.md) › [Documentation](../../docs/README.md) › packages/schemas

# packages/schemas

Zod schemas for entities and forms, plus their metadata. Pure TypeScript; the only runtime dependency
is `zod`. This is the **single source of truth** for the shape of data: the database, backend and
frontend validation, types, OpenAPI, admin columns and forms all come from here.

## The entity model (`defineEntity`)

An entity is a Zod schema (shape and validation, including cross-field rules through `refine`) **plus**
presentation metadata per field (`label`, `control`, `options`, `relation`, `list`).

- `name` / `plural` — singular and plural. `name` must be a camelCase identifier; from `plural` the
  scaffolder derives the table name, the API path and the file names (the forms are documented in
  [`tools/scaffold/README.md`](../../tools/scaffold/README.md)).
- `label` / `labelPlural` — UI labels (the detail page, and the admin menu and list).
- `entity.schema` — the plain schema, without cross-field validation.
- `entity.validation` — the schema including `refine` (or `schema` when `refine` is not set). Used as
  the create body in the API.
- `entity.fields` — presentation metadata per field. `control` maps to a design-system component.

Declare fields with the **`f.*` builders** through `defineEntity` (the default path). For shapes the
builders cannot express there is a separate function, `defineEntityRaw` — your own `schema` plus a
companion `fields` map.

## Field builders (`f.*`) — the default path

```ts
import { defineEntity, f } from "@repo/schemas";

export const ticketEntity = defineEntity({
  name: "ticket",
  plural: "tickets",
  label: "Ticket",
  labelPlural: "Tickets",
  displayField: "title",
  // optional CROSS-FIELD validation (the schema is derived from the fields):
  refine: (schema) =>
    schema.refine((value) => !value.dueDate || value.dueDate > new Date(), {
      message: "Termin musi być w przyszłości.",
      path: ["dueDate"],
    }),
  fields: {
    title: f.text().min(1).sortable().filterable(),
    status: f.select({ open: "Open", done: "Done" }).filterable(),
    dueDate: f.date().help("Opcjonalny termin").optional().sortable(),
    projectId: f.relation("project", "name").filterable(),
  },
});
```

One declaration produces **both** halves: the Zod schema and the metadata. As a result:

- `control` cannot drift away from the Zod type — the same fact is not declared twice;
- the value list of a `select`/`radio` is written **once** (a `value → label` map instead of a
  `z.enum` here and `options` there);
- typing `f.` in the editor lists every control, and each control offers only the methods that make
  sense for it — no need to memorise metadata key names.

### Factories

| Factory                          | Zod type            | Own methods                            |
| -------------------------------- | ------------------- | -------------------------------------- |
| `f.text()`                       | `z.string()`        | `.min` `.max` `.email` `.url` `.regex` |
| `f.textarea()`                   | `z.string()`        | same as `text`                         |
| `f.number()`                     | `z.number()`        | `.int` `.min` `.max` `.nonnegative`    |
| `f.date()`                       | `z.coerce.date()`   | — (date only)                          |
| `f.datetime()`                   | `z.coerce.date()`   | — (date with time)                     |
| `f.checkbox()` / `f.switch()`    | `z.boolean()`       | —                                      |
| `f.select(map)` / `f.radio(map)` | `z.enum(map keys)`  | — (the map carries values and labels)  |
| `f.relation(entity, field)`      | `z.string().uuid()` | —                                      |

### Shared methods

| Method                          | Effect                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `.label(text)`                  | The field label; **omit it** and it is derived from the field name (`dueDate` → "Due date")   |
| `.help(text)`                   | A hint rendered under the field by `forms-ui`                                                 |
| `.optional()`                   | Makes the field optional (`nullish`); position in the chain does not matter                   |
| `.sortable()` / `.filterable()` | A sortable / filterable column in the admin panel (it enters the allowlist in the API module) |
| `.hidden()`                     | Hides the column in the list (the field stays in the form and on the detail page)             |
| `.unique()`                     | The value is unique in the table (see below)                                                  |
| `.zod(fn)`                      | Escape hatch: any transformation of the field schema (`regex`, `refine`, `transform`)         |

Builders are **immutable** — every method returns a new builder, so a base field definition can be
shared and extended safely.

`.zod()` returns a builder without the type-specific methods, so call it after the sugar:

```ts
slug: f.text().max(80).zod((schema) => schema.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)),
```

### Uniqueness

Single-field uniqueness is declared on the field, **composite** uniqueness on the entity — both end up
in `entity.unique`:

```ts
export const registrationEntity = defineEntity({
  // …
  // the e-mail is unique within an event, not globally:
  unique: [["eventId", "email"]],
  fields: {
    eventId: f.relation("event", "name"),
    email: f.text().email(),
    code: f.text().unique(), // globally unique
  },
});
```

The scaffolder turns each group into a **partial** unique index (`where deleted_at is null`), so a
soft delete releases the value — a soft-deleted row does not block it forever. A violation comes back
from the API as a **409** naming the fields that collided (not as a 500), and the form highlights
them.

## `defineEntityRaw` — the escape hatch

When a field needs a shape the builders cannot express, pass your own `schema` and the metadata
directly. This is a **separate function**, not a variant of `defineEntity`, so both keep a single
signature and an error in an entity definition points at the offending field rather than at the whole
call.

In that mode TypeScript enforces **key parity between `fields` and the schema** (a missing metadata
entry is a compile error), but pairing `control` with the Zod type is **up to you**:

| `control`             | Zod type            | Also requires | Type variant        |
| --------------------- | ------------------- | ------------- | ------------------- |
| `text` / `textarea`   | `z.string()`        | —             | `SimpleFieldMeta`   |
| `number`              | `z.number()`        | —             | `SimpleFieldMeta`   |
| `date` / `datetime`   | `z.coerce.date()`   | —             | `SimpleFieldMeta`   |
| `checkbox` / `switch` | `z.boolean()`       | —             | `SimpleFieldMeta`   |
| `select` / `radio`    | `z.enum([...])`     | `options`     | `ChoiceFieldMeta`   |
| `relation`            | `z.string().uuid()` | `relation`    | `RelationFieldMeta` |

`FieldMeta` is a union discriminated by `control`, so `tsc` enforces the extras (a `select` without
`options` is an error, and so is a `text` with `options`) — but it does **not** check the Zod type.
Lifting exactly that invariant off the author is what the builders are for.

```ts
import { z } from "zod";
import { defineEntityRaw } from "@repo/schemas";

const shape = z.object({ title: z.string().min(1) });

export const ticketEntity = defineEntityRaw({
  name: "ticket",
  plural: "tickets",
  label: "Ticket",
  labelPlural: "Tickets",
  displayField: "title",
  schema: shape,
  fields: {
    title: { label: "Title", control: "text", list: { sortable: true, filterable: true } },
  },
});
```

The reference entities — `project.entity.ts`, `task.entity.ts`, `comment.entity.ts` — all use the
builders. Labels are written in English (the admin language).

## Related

- [How to add an entity](../../docs/recipes/how-to-add-an-entity.md) — the full process end to end
- [`tools/scaffold`](../../tools/scaffold/README.md) — what the generator derives from an entity
- [`packages/forms-ui`](../forms-ui/README.md) — the `control` → design-system component mapping
- [ADR-0004](../../docs/adr/ADR-0004-entity-field-builders.md) — why builders are the default
- [ADR-0005](../../docs/adr/ADR-0005-entity-name-forms-and-uniqueness.md) — name forms and uniqueness
- [ADR-0006](../../docs/adr/ADR-0006-splitting-define-entity.md) — why `defineEntityRaw` is separate
