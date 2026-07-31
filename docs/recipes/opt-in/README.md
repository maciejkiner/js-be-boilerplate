[Home](../../../README.md) › [Documentation](../../README.md) › [Recipes](../README.md) › Opt-in modules

# Opt-in modules — recipes and interfaces only

These modules are **deliberately NOT implemented** in the bootstrap (specification, sections 2 and 6).
What you get is a recipe plus an interface sketch — you turn the module on **in your project**, once
you actually need it. The bootstrap stays light ("nothing on spec").

| Module                                       | What it adds                                       |
| -------------------------------------------- | -------------------------------------------------- |
| [`multi-tenancy.md`](./multi-tenancy.md)     | Organizations, invitations, per-organization roles |
| [`file-upload.md`](./file-upload.md)         | Storage abstraction and upload handling            |
| [`save-and-resume.md`](./save-and-resume.md) | Persisting partial wizard state                    |
| [`opentelemetry.md`](./opentelemetry.md)     | Tracing (OTel)                                     |
| [`job-queues.md`](./job-queues.md)           | Queues and background jobs                         |

The rule: until you turn a module on, its services, tables and dependencies do not exist. Turning it
on adds them **in your project** (schema, adapter, endpoint, and possibly a compose service),
following the recipe.

## Related

- [Recipes](../README.md) — all step-by-step procedures
- [`PLAN.md`](../../../PLAN.md) — what else is intentionally out of scope
- [`CLAUDE.md`](../../../CLAUDE.md) — the boundary that keeps these modules opt-in
