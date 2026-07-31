[Home](../../README.md) › [Documentation](../README.md) › Architecture decisions

# Architecture Decision Records

Every significant decision (a technology, a pattern, a service boundary) is recorded here as an ADR,
written from the [template](../../adr-template.md).

- Naming: `ADR-NNNN-short-title.md` (increasing four-digit number).
- An ADR is **immutable** — changing a decision means writing a new ADR that references the old one.
- Format: context → options considered → decision → consequences.

Many decisions were already settled by the
[project specification](../../spec/bootstrap-project-description.md); ADRs cover what was decided
_while building_ the bootstrap (entity metadata format, the scaffolder contract, and so on).

## Records

| ADR                                                         | Decision                                                         | Status   | Date       |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | -------- | ---------- |
| [ADR-0001](./ADR-0001-openapi-generation.md)                | Generate OpenAPI from the Zod schemas, never write it by hand    | Accepted | 2026-07-23 |
| [ADR-0002](./ADR-0002-full-stack-containerization.md)       | Full-stack containerization as separate compose overlays         | Accepted | 2026-07-25 |
| [ADR-0003](./ADR-0003-self-contained-full-stack-compose.md) | Self-contained compose files; Postgres not published to the host | Accepted | 2026-07-27 |
| [ADR-0004](./ADR-0004-entity-field-builders.md)             | Field builders (`f.*`) as the default way to declare an entity   | Accepted | 2026-07-29 |
| [ADR-0005](./ADR-0005-entity-name-forms-and-uniqueness.md)  | Entity name forms in the scaffolder, uniqueness in the entity    | Accepted | 2026-07-30 |
| [ADR-0006](./ADR-0006-splitting-define-entity.md)           | Split `defineEntity` into two functions instead of an overload   | Accepted | 2026-07-30 |

## Related

- [Documentation map](../README.md) — every document in the repository
- [Recipes](../recipes/README.md) — the procedures these decisions shaped
- [`adr-template.md`](../../adr-template.md) — the template for a new record
