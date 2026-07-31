[Home](../../README.md) › [Documentation](../README.md) › [Architecture decisions](./README.md) › ADR-0002

# ADR-0002: Full-stack containerization (dev HMR + prod-like) as separate compose overlays

- **Status:** Accepted
- **Date:** 2026-07-25
- **Authors:** bootstrap team
- **Related:** ADR-0001, phase 6, `docker-compose.yml`

## Context

An organizational requirement: teams using the bootstrap must be able to (1) **work in isolated,
containerized projects** and (2) start **the whole application with a single `docker compose`**
(Postgres + mailhog + API + web + admin). Until now `docker-compose.yml` deliberately covered only the
infrastructure (Postgres + mailhog) while the application ran natively (`pnpm dev`) — the best DX, but
it did not satisfy "the whole stack in containers".

Technical constraints: the API has a native dependency, `@node-rs/argon2` (platform-specific
binaries, so the host's `node_modules` must not be bind-mounted), and the Vite shells inject
`VITE_API_URL` **at build time**, not at runtime.

## Considered options

1. **Add the application services to the existing `docker-compose.yml`** (possibly behind profiles).
   Pros: one file. Cons: it changes what the default `docker compose up` does (today: lightweight
   infrastructure), mixes two goals (infrastructure versus application) and makes two modes
   (dev/prod) harder to maintain in one file.
2. **Separate overlay files and two modes** — the base `docker-compose.yml` stays as it is;
   `docker-compose.app.yml` holds the prod-like images (compiled API, web/admin served by nginx with
   an SPA fallback) and `docker-compose.dev.yml` holds the HMR mode (`pnpm dev`, source bind-mounted,
   `node_modules` in named volumes). Pros: the lightweight native flow is preserved, the modes are
   explicitly separated, and "the whole stack" is one overlay away. Cons: several files and a long
   command (shortened in `package.json`).
3. **Only prod-like** or **only dev** — rejected: the requirement covers both (working inside
   containers **and** sealed images for running, QA and deployment).

## Decision

We choose **option 2**. `docker-compose.yml` remains infrastructure-only (the default lightweight dev
setup). The full stack is added through overlays:

- **prod-like:** `docker compose -f docker-compose.yml -f docker-compose.app.yml up --build`
  (`pnpm docker:full`) — multi-stage Dockerfiles (`apps/*/Dockerfile`), `pnpm deploy` for the API,
  nginx with an SPA fallback for the shells, and `VITE_API_URL` as a **build ARG**.
- **dev HMR:** `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
  (`pnpm docker:dev`) — a shared `docker/Dockerfile.dev`, bind-mounted source, `node_modules` and the
  pnpm store in named volumes (Linux binaries), a one-shot `install` service (dependencies plus a
  library build) and `pnpm --filter <app> dev`.

## Consequences

- **Positive:** "the whole stack in one compose" is satisfied in both modes; the native flow is
  unchanged; the package boundary holds (the environment is still injected explicitly — for the
  frontend as a build ARG).
- **Negative / costs:** maintaining the Dockerfiles and two overlays; in dev mode changing a
  **library** (`packages/*`, the design system) requires a rebuild (HMR covers `apps/*` sources and
  the API through `tsx watch`); on macOS and Windows, watching through a bind mount needs polling
  (configured in the overlay).
- **Impact:** new files `docker-compose.app.yml`, `docker-compose.dev.yml`, `apps/*/Dockerfile`,
  `docker/{Dockerfile.dev,nginx.spa.conf}` and `.dockerignore`; a small change in
  `apps/{web,admin}/vite.config.ts` (`host: true`, optional polling). Registry deployment, HTTPS and a
  production compose file are outside the bootstrap's scope (each project decides). Recipe:
  [How to run in Docker](../recipes/how-to-run-in-docker.md).

> Superseded in structure by [ADR-0003](./ADR-0003-self-contained-full-stack-compose.md): the overlays
> became self-contained files. The two-mode decision above still stands.

## Related

- [ADR-0003](./ADR-0003-self-contained-full-stack-compose.md) — the follow-up that refined this structure
- [How to run in Docker](../recipes/how-to-run-in-docker.md) — the resulting workflow
- [Architecture decisions](./README.md) — the full index
