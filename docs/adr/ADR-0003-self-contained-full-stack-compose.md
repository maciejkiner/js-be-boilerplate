[Home](../../README.md) › [Documentation](../README.md) › [Architecture decisions](./README.md) › ADR-0003

# ADR-0003: Self-contained full-stack compose files (Postgres not published to the host)

- **Status:** Accepted
- **Date:** 2026-07-27
- **Authors:** bootstrap team
- **Related:** ADR-0002 (this refines its structure)

## Context

ADR-0002 defined the full stack as **overlays** on `docker-compose.yml`
(`docker compose -f docker-compose.yml -f docker-compose.app.yml up`). In practice that produced two
problems:

1. **Port 5432 collisions.** The base file publishes Postgres on the host
   (`${POSTGRES_PORT:-5432}`). When 5432 is already taken by another project, the `postgres`
   container fails to start (`Bind for 0.0.0.0:5432 failed`) and the run ends with the API reporting
   `getaddrinfo ENOTFOUND postgres`. In full-stack mode the API talks to the database **internally**
   (`postgres:5432`), so publishing the port is pointless. An overlay cannot remove a port from the
   base file — `ports` lists are **merged**, not overridden.
2. **The two-`-f` footgun.** Running the overlay alone (without the base) leaves you with no
   `postgres` or `mailhog` service.

## Considered options

1. **Keep the overlay and document `POSTGRES_PORT`.** This removes neither the collision (the user has
   to remember) nor the two-file footgun.
2. **Self-contained full-stack files** — `docker-compose.app.yml` and `docker-compose.dev.yml` carry
   their own `postgres` and `mailhog` services (with Postgres **not** published to the host), started
   with a single `-f`. `docker-compose.yml` (the native-dev infrastructure) stays untouched.

## Decision

We choose **option 2**. The full-stack files are self-contained and started with one `-f`
(`pnpm docker:full` → `docker compose -f docker-compose.app.yml up --build`, and likewise for
`docker:dev`). Postgres in those files **does not publish a port to the host**; diagnostic access goes
through `docker compose … exec postgres psql`. The application ports (`API_PORT`/`WEB_PORT`/
`ADMIN_PORT`) and the mailhog UI stay published. This changes the structure from ADR-0002 (overlay →
self-contained) while preserving its essence: two modes (prod-like and dev), with
`docker-compose.yml` unchanged for native development.

## Consequences

- **Positive:** no 5432 collisions (verified: the full stack comes up even with 5432 taken — health,
  seed and login all fine); one command really is "the whole stack as a single docker-compose"; the
  two-`-f` footgun is gone.
- **Negative / costs:** the `postgres` and `mailhog` definitions are duplicated between
  `docker-compose.yml` and the full-stack files — a deliberate, small duplication instead of fragile
  merging of `ports` lists.
- **Impact:** `docker-compose.app.yml` and `docker-compose.dev.yml` (self-contained), and the
  `docker:*` scripts in the root `package.json` (a single `-f`). Documentation: the README and
  [How to run in Docker](../recipes/how-to-run-in-docker.md).

## Related

- [ADR-0002](./ADR-0002-full-stack-containerization.md) — the decision this one refines
- [How to run in Docker](../recipes/how-to-run-in-docker.md) — the resulting workflow
- [Architecture decisions](./README.md) — the full index
