[Home](../../README.md) › [Documentation](../README.md) › Recipes

# Recipes

Step-by-step procedures written for humans **and** agents. A recipe that describes a process the
scaffolder generates is at the same time its specification — that is what keeps the generator and the
documentation from drifting apart.

## Backend

| Recipe                                                                  | What it covers                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [How to add an entity](./how-to-add-an-entity.md)                       | The whole path: Zod entity → scaffolder → migration → API client |
| [How to add a migration](./how-to-add-a-migration.md)                   | Drizzle migrations, expand → migrate → contract, seeders         |
| [API module structure](./api-module-structure.md)                       | routes → service → repository, error handling, pagination        |
| [How to add an identity provider](./how-to-add-an-identity-provider.md) | The provider interface that email + password implements          |
| [Cursor-based pagination](./cursor-based-pagination.md)                 | The alternative to the offset pagination used in core            |

## Frontend

| Recipe                                                                    | What it covers                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Frontend shell structure](./frontend-shell-structure.md)                 | Vite, router, entity registry, the `packages/` boundary      |
| [How to define a form](./how-to-define-a-form.md)                         | `useForm`, wizards, adding a field type, errors from the API |
| [How to regenerate the API client](./how-to-regenerate-the-api-client.md) | OpenAPI dump → generated types → TanStack Query hooks        |
| [How to update the design system](./how-to-update-the-design-system.md)   | The read-only subtree and how changes flow upstream          |

## Operations

| Recipe                                            | What it covers                                         |
| ------------------------------------------------- | ------------------------------------------------------ |
| [How to run in Docker](./how-to-run-in-docker.md) | Three modes (infra / prod-like / HMR), ports, pitfalls |

## Opt-in modules

Deliberately **not implemented** in the bootstrap — recipes and interface sketches only, so the
starting point stays light. Rules: [`opt-in/README.md`](./opt-in/README.md). Individual recipes:
[multi-tenancy](./opt-in/multi-tenancy.md), [file upload](./opt-in/file-upload.md),
[save & resume](./opt-in/save-and-resume.md), [OpenTelemetry](./opt-in/opentelemetry.md),
[job queues](./opt-in/job-queues.md).

## Writing a new recipe

- One recipe answers one question, and its file name says which: `how-to-<do-something>.md`, or
  `<area>-structure.md` when it documents a layout rather than a procedure.
- Open with the breadcrumb line
  (`[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md)`) and close with
  a **Related** section — that is what makes the set clickable on GitHub.
- Add the new recipe to the table above **and** to the [documentation map](../README.md).

## Related

- [Documentation map](../README.md) — every document in the repository
- [Architecture decisions](../adr/README.md) — why the conventions look the way they do
- [`CLAUDE.md`](../../CLAUDE.md) — the conventions these recipes elaborate on
