[Home](../README.md) › Documentation

# Documentation map

Documentation is treated like code: it is updated in the same pull request that changes the
behaviour or the convention (see the Definition of Done in [`CLAUDE.md`](../CLAUDE.md)). Everything
in the repository is listed below — if a document is not here, it does not exist.

## I want to…

| Task                                          | Read this                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Run the project for the first time            | [Getting started](../README.md#getting-started)                                   |
| Understand the rules before changing anything | [`CLAUDE.md`](../CLAUDE.md)                                                       |
| Add a domain entity end to end                | [How to add an entity](./recipes/how-to-add-an-entity.md)                         |
| Change the database schema                    | [How to add a migration](./recipes/how-to-add-a-migration.md)                     |
| Build a form or a wizard                      | [How to define a form](./recipes/how-to-define-a-form.md)                         |
| Add an endpoint by hand                       | [API module structure](./recipes/api-module-structure.md)                         |
| Work on the web or admin shell                | [Frontend shell structure](./recipes/frontend-shell-structure.md)                 |
| Regenerate the API client                     | [How to regenerate the API client](./recipes/how-to-regenerate-the-api-client.md) |
| Know why a decision was made                  | [Architecture decision records](./adr/README.md)                                  |
| Turn on multi-tenancy, uploads, queues, …     | [Opt-in modules](./recipes/opt-in/README.md)                                      |

## Recipes

Step-by-step procedures written for humans **and** agents. A recipe describing a process that the
scaffolder generates doubles as its specification, which keeps the two from drifting apart.
Full index with status: [`recipes/README.md`](./recipes/README.md).

| Recipe                                                                            | What it covers                                        |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [How to add an entity](./recipes/how-to-add-an-entity.md)                         | Zod entity → scaffolder → migration → client          |
| [How to add a migration](./recipes/how-to-add-a-migration.md)                     | Drizzle, expand → migrate → contract, seeders         |
| [API module structure](./recipes/api-module-structure.md)                         | routes → service → repository, errors, pagination     |
| [How to add an identity provider](./recipes/how-to-add-an-identity-provider.md)   | The provider interface behind email + password        |
| [How to regenerate the API client](./recipes/how-to-regenerate-the-api-client.md) | OpenAPI dump → generated types → hooks                |
| [Frontend shell structure](./recipes/frontend-shell-structure.md)                 | Vite, router, entity registry, the packages boundary  |
| [How to define a form](./recipes/how-to-define-a-form.md)                         | `useForm`, wizards, field types, errors from the API  |
| [How to run in Docker](./recipes/how-to-run-in-docker.md)                         | Three modes, ports, pitfalls                          |
| [How to update the design system](./recipes/how-to-update-the-design-system.md)   | The read-only subtree and how changes flow upstream   |
| [Cursor-based pagination](./recipes/cursor-based-pagination.md)                   | The alternative to the offset pagination used in core |
| [Opt-in modules](./recipes/opt-in/README.md)                                      | Multi-tenancy, uploads, save & resume, OTel, queues   |

## Architecture decisions

Significant decisions are recorded as ADRs and are immutable — changing your mind means writing a new
ADR that references the old one. Index and rules: [`adr/README.md`](./adr/README.md). Template:
[`../adr-template.md`](../adr-template.md).

## Design system

- [`ds-component-inventory.md`](./ds-component-inventory.md) — inventory of design-system components:
  the vocabulary that generators and field renderers map onto.
- [`ds-gap-analysis.md`](./ds-gap-analysis.md) — what the mock design system is missing compared to
  what the bootstrap actually needs.

## DX pilot

- [`dx-pilot/conference.md`](./dx-pilot/conference.md) — specification of the sample project used to
  measure developer experience on this bootstrap. Not part of the bootstrap: the project code is
  reverted once the pilot ends, and only the engine fixes it forced stay behind.

## Backlog

- [`backlog/ideas.md`](./backlog/ideas.md) — scratchpad for ideas that have no owner yet.

## Related

- [Repository root](../README.md) — installation, commands, structure
- [`CLAUDE.md`](../CLAUDE.md) — conventions, boundaries, Definition of Done
- [`PLAN.md`](../PLAN.md) — build phases and their status
- [`spec/bootstrap-project-description.md`](../spec/bootstrap-project-description.md) — the binding specification
