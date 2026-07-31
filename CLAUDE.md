# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Instructions for AI agents and for the team. Apply them to every change. This is the **canonical**
source of conventions (the former `RULES.md` was folded in here). Looking for a specific document?
The [documentation map](./docs/README.md) indexes everything.

## What this repository is

A bootstrap (starter repository) for TypeScript backend + frontend projects. The binding
specification: [`spec/bootstrap-project-description.md`](./spec/bootstrap-project-description.md).
The build plan and its status: [`PLAN.md`](./PLAN.md) — **read it and continue from the first
unchecked task**; do not run ahead of the phases, and stop for approval at every `[DECISION]` point.
Philosophy: a bootstrap not a framework (fork & forget), a generator not a runtime engine, a single
source of truth (Zod schema + metadata), AI-first, convention over configuration.

## Monorepo structure (pnpm + Turborepo)

```
apps/
  api      — Fastify + Zod, domain modules mounted from a registry        (phase 1+)
  web      — the default shell: Vite + React + TanStack Router            (phase 6)
  admin    — admin panel, separately deployable (subdomain)               (phase 6)
packages/
  schemas    — Zod schemas for entities and forms + metadata; pure TS      (phase 4)
  api-client — client generated from OpenAPI; framework-agnostic (fetch)   (phase 5)
  api-react  — TanStack Query bindings over the client                     (phase 5)
  forms      — headless form engine                                        (phase 7)
  forms-ui   — field renderers wired to the design system                  (phase 7)
  ui         — compositions on the DS: DataTable, admin layout, EmptyState (phase 6)
  config     — shared ESLint / Prettier / tsconfig                         (exists)
design-system/ — the DS as a git subtree (a placeholder for now; READ-ONLY)
docs/          — recipes, adr/, ds-component-inventory.md
```

## Commands

- `pnpm install` — install (workspace).
- `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm test` — through Turborepo, the whole monorepo.
- `pnpm format` / `pnpm format:check` — Prettier.
- `pnpm dev` — everything in watch mode: `apps/{api,web,admin}` plus `tsc -w` for the library packages. **The shells consume the packages' `dist`**, so without those watchers a change in `packages/*` never reaches the browser (Vite HMR only sees application code) — after `pnpm --filter <app> dev` you would have to run `pnpm build` by hand. `design-system` has no watcher: it is read-only.
- `docker compose up -d` (or `pnpm docker:up`) — infrastructure: Postgres (5432) + mailhog (SMTP 1025, UI 8025); the app itself runs natively with `pnpm dev`.
- The whole stack in containers: `pnpm docker:full` (prod-like: API images + web/admin behind nginx) or `pnpm docker:dev` (HMR). Admin seed: `pnpm docker:full:seed`. Ports: `API_PORT`/`WEB_PORT`/`ADMIN_PORT`. Recipe: [`docs/recipes/how-to-run-in-docker.md`](./docs/recipes/how-to-run-in-docker.md) (ADR-0002).
- Narrow to one workspace: `pnpm turbo run test --filter=@repo/<name>`.
- API: `pnpm --filter @repo/api dev` (watch) / `build` / `start`. A single test: `pnpm --filter @repo/api test -- <pattern>`.
- Database: `pnpm --filter @repo/api db:generate` / `db:migrate` / `db:seed` / `db:studio`. Database integration tests need `TEST_DATABASE_URL` (they are skipped without it).
- API client: `pnpm generate:client` (dump OpenAPI from the schemas → client types). After every API change; CI enforces freshness with `git diff`.
- Frontend shells: `pnpm --filter @repo/web dev` (5173) / `pnpm --filter @repo/admin dev` (5174). Build: `tsc --noEmit && vite build`. The views need a running API (3000). The port is overridable through `PORT`.
- E2E: `pnpm --filter @repo/e2e test:e2e` (Playwright starts API + web + admin itself; needs `DATABASE_URL` **and SMTP on 1025** — mailhog from `docker compose`, because the wizard sends invitations; `global-setup.ts` seeds the admin account for the views behind RBAC). Local port collisions: `E2E_API_PORT`/`E2E_WEB_PORT`/`E2E_ADMIN_PORT`. First run: `pnpm --filter @repo/e2e exec playwright install chromium`.
- Scaffolder: `pnpm scaffold <entity>` — from an entity in `@repo/schemas` it generates Drizzle + the API module + hooks + admin views + a CRUD test. It builds `@repo/schemas` automatically (it reads that package's `dist`, as `db:generate` does for drizzle-kit). Afterwards: `db:generate` + `generate:client`.

## Stack (settled — do not propose alternatives)

Node 22 LTS · pnpm · Turborepo · TypeScript strict · PostgreSQL · Drizzle · Fastify + Zod
(`fastify-type-provider-zod`) · REST + OpenAPI (`zod-openapi`) + a generated client · Vite + React +
TanStack Router/Query · Vitest + Playwright · pino · docker-compose (Postgres + mailhog) ·
error tracking behind an abstraction + a Sentry adapter · GitHub Actions.

## Hard boundaries (enforced in review and by lint)

- **The DS is read-only**: do not edit `design-system/`. Changes go upstream, or through
  `packages/ui`.
- **`packages/` without a shell**: no router imports (`@tanstack/react-router`) and no
  `import.meta.env`. React yes, TanStack Query yes; the environment is injected explicitly when the
  shell initialises. The rule is enforced by `@repo/config/eslint-package`. `apps/admin`, as a second
  shell, is a permanent test of this boundary.
- **Opt-in modules** (multi-tenancy, upload, save & resume, OTel, queues) and everything listed as
  "out of scope" (see `PLAN.md`): do not implement them — recipes and interfaces only
  ([`docs/recipes/opt-in/`](./docs/recipes/opt-in/README.md)).

## Priorities (in this order)

1. Do not break existing functionality (zero regressions).
2. Readability and maintainability over cleverness.
3. Tests and observability are part of a change, not an addition to it.

## Always

- Small, single-topic changes. Split a large task into stages.
- Tests for business logic and edge cases, proportional to the risk.
- Separated layers: backend controller → service → repository; frontend logic separated from
  presentation.
- Validate input at the system boundary (the API) with Zod schemas.
- Descriptive names; booleans with `is`/`has`/`can`. One convention across the whole repository.
- Comment the "why", not the "what".
- Structured logs (JSON) with levels and a `correlation_id`; metrics and tracing for the key paths.
- Risky new behaviour behind a feature flag.
- Frontend: handle every UI state (loading/error/empty/success); accessibility is a requirement;
  watch the bundle.

## Never

- Do not remove or change API fields or endpoints without versioning and checking the consumers.
- Do not make incompatible schema changes — stage them expand → migrate → contract.
- Do not put secrets or PII into the code or the logs.
- Do not swallow exceptions silently — errors are handled explicitly and consistently.
- Do not add abstractions "just in case", nor unused dependencies.
- Do not optimise without measuring (profile first; set budgets).

## Backward compatibility (critical)

- API changes are additive. A breaking change means versioning plus a transition period.
- Database: expand → data migration → contract. Every production change has a rollback plan.
- Regression and contract (BE ↔ FE) tests must pass.

## Conventions

- **Branch:** `type/description-in-kebab-case` (feat, fix, refactor, chore, docs, test, hotfix); add the ticket number.
- **Commit:** `type(scope): description` in the imperative mood, lower case, no full stop. Breaking: `type(scope)!:` + `BREAKING CHANGE:`.
- **Backend:** types `PascalCase`, constants `UPPER_SNAKE_CASE`, everything else per the language convention.
- **Frontend:** components `PascalCase`, hooks `useCamelCase`, everything else `camelCase`.
- **API:** plural paths, `kebab-case`, prefixed with `/api/v1`; JSON field naming consistent across the API.
- **API errors:** RFC 7807 (problem+json), consistent with the global handler. An error about specific fields carries the `errors` extension (`[{ path, message }]` — the same list for validation 400, conflict 409 and 422): `detail` is for a human, `errors` is for a form. Build uniqueness conflicts with `uniqueConflictError(label, fields)`. The client (`ApiError.errors`) → `serverErrorToFieldErrors` from `@repo/forms` → an error next to the control. Views do **not** wrap a submit in `try/catch` with a stand-in message — that erases the API response.
- **Pagination:** offset-based in core; cursor-based as a recipe.
- **Database (Drizzle):** audit columns (`created_at`/`updated_at`/`created_by`) and soft delete (`deleted_at`) come from the helpers in `src/db/columns.ts`; reads go through `notDeleted()`. Migrations are generated from the schema (never hand-written; `drizzle-kit` reads the compiled `dist`, so `db:generate` builds first) and registered at the anchor in `src/db/schema.ts`. Breaking changes: expand → migrate → contract. Seeders are idempotent. Recipe: [`docs/recipes/how-to-add-a-migration.md`](./docs/recipes/how-to-add-a-migration.md).
- **Entities:** the single source of truth is a Zod schema + metadata in `packages/schemas` (`defineEntity` + `validation` with a cross-field `refine`). Declare fields with the **`f.*` builders** (`f.text().min(1).sortable()`, `f.select({ value: "Label" })`, `f.relation("venue", "name").optional()`) — one declaration produces both the Zod schema and the metadata, so `control` cannot drift away from the Zod type and `select` values are written once; a label omitted from `.label()` is derived from the field name. The escape hatch for shapes the builders cannot express is a **separate function**, `defineEntityRaw` (your own `schema` + a companion `fields` map, with key parity enforced by the type) — they are separate so that each has one signature and an error points at the field rather than at the whole call. Uniqueness: `.unique()` on a field, composite as `unique: [["eventId", "email"]]` on the entity — the scaffolder turns it into a **partial** unique index (`where deleted_at is null`, so a soft delete releases the value) and maps a conflict to a 409. Entity and admin labels are in English. The Drizzle table lives in the API module (enums as `text().$type<>()`, relations through `.references()` with an explicit `onDelete`). DTOs are derived from the entity (`entity.validation`/`schema.partial()`/`schema.extend()`). Module: routes → service → repository, sorting through a column allowlist, soft delete, `createdBy` from the session. Registration at the `db/schema.ts` and `modules/index.ts` anchors. Reference entities: `Project`, `Task`. Recipe: [`docs/recipes/how-to-add-an-entity.md`](./docs/recipes/how-to-add-an-entity.md).
- **Scaffolder (`tools/scaffold`):** `pnpm scaffold <entity>` reads the entity from `@repo/schemas` (the only source of truth) and generates the derived layers (Drizzle, the CRUD API module, api-react hooks, the admin List/Detail/Create/Edit views, a CRUD test), registering them at the `// scaffolder:… — do not remove` anchors (no AST). `control` → Drizzle/Zod/component types; generated code is formatted with Prettier; it never overwrites files; registrations are idempotent. **Name forms:** `plural` yields four spellings — code identifiers `camelCase`, the table `snake_case`, the API and admin path and the file names `kebab-case` (multi-word entities such as `talkSpeaker` work without workarounds; `name` must be a camelCase identifier). Scope: one-to-many yes, single- and multi-field uniqueness yes (a partial index + 409); upload and full-text search no. Many-to-many with attributes is an ordinary entity with two relations (scaffoldable), but nested routes and an assignment widget on the parent's detail page are added by hand. Recipe: [`docs/recipes/how-to-add-an-entity.md`](./docs/recipes/how-to-add-an-entity.md), details in [`tools/scaffold/README.md`](./tools/scaffold/README.md).
- **Frontend (shells + UI):** `design-system/` is the workspace package `@repo/design-system` (a Tailwind mock following the inventory in section 10, READ-ONLY). `packages/ui` holds compositions on the DS (`DataTable`, `AdminLayout`, `EmptyState`), router-agnostic (nav and actions as slots). The shells `apps/{web,admin}` are Vite + React + TanStack Router (code-based); the environment (`import.meta.env.VITE_API_URL`) and the router live **only in the shells**. Tailwind v4: `@import "tailwindcss"` plus `@source` pointing at `design-system/src` and `packages/ui/src`. Admin: an entity registry (`src/entities/registry.ts`, anchor `scaffolder:admin-entities`) → the menu and the routes; the `ProtectedShell` auth gate; list, detail and delete views. Recipe: [`docs/recipes/frontend-shell-structure.md`](./docs/recipes/frontend-shell-structure.md).
- **Forms:** `packages/forms` is a headless engine on Zod (`useForm` — per-field and cross-field validation through `refine`, plus an error thrown from `onSubmit` mapped onto the fields and `_form`; `useWizard` — steps plus an `onComplete` orchestrating several handlers, with the final error in `submitError` and on the fields, and `WizardStepError.from(stepId, error)` returning to the step while keeping the original error). Build wizards with `<Wizard>` from `packages/forms-ui` (an imposed structure: stepper + navigation + state and gating; you inject `steps[].render` + `onComplete`, with the `entityStep` helper); `useWizard` is the escape hatch without the chrome. `packages/forms-ui` holds the renderers with an **explicit mapping** `FieldControl → design-system component` (table in the README) plus `deriveFields(entity)`/`emptyValues(entity)`. An entity form is derived from `entity.fields` + `entity.validation` (a single source of truth). Relation fields: a **generic** `RelationSource` injected by the shell (an async fetcher over `GET /api/v1/<plural>`, working for any target entity without registration; the label comes from `relation.displayField`). The reference "create a project" wizard: data → database, invitations → **the mailer** (`POST /projects/:id/invitations`, nothing persisted), tasks → bulk. Save & resume is opt-in. Recipe: [`docs/recipes/how-to-define-a-form.md`](./docs/recipes/how-to-define-a-form.md).
- **API client:** `packages/api-client` holds types generated from OpenAPI (`openapi-typescript`) plus the `openapi-fetch` runtime (framework-agnostic, `baseUrl` injected explicitly, `credentials: "include"`); `openapi.json` is dumped from the Zod schemas (`apps/api openapi:dump`, offline), never written by hand. `packages/api-react` holds the TanStack Query bindings over the client: `ApiProvider` (injects the client), `use{Projects,Tasks,…}` hooks plus mutations invalidating `*Keys.all`, and query-option factories testable without React. Regeneration: `pnpm generate:client` (CI enforces it with `git diff`). Recipe: [`docs/recipes/how-to-regenerate-the-api-client.md`](./docs/recipes/how-to-regenerate-the-api-client.md).
- **Auth:** email + password (argon2) as the first implementation of the identity provider interface (`modules/auth/providers/`); sessions are an access JWT (cookie) plus an opaque hashed refresh token (the `sessions` table, rotated); RBAC through `roles` on the user plus the `requireRoles()` guard after `app.authenticate`; password reset through the mailer abstraction (`lib/mailer`, dev = mailhog); admin on a subdomain: CORS with two origins plus cookies (`COOKIE_DOMAIN`). Secrets and tokens are stored as hashes only. Recipe: [`docs/recipes/how-to-add-an-identity-provider.md`](./docs/recipes/how-to-add-an-identity-provider.md).

## Language

Documentation, code comments, commit messages and test names are in **English**. User-facing runtime
strings (problem+json messages, admin toasts and labels) are currently Polish — do not translate them
as a side effect of another change.

## Architecture decisions

- Record a significant decision as an ADR in [`docs/adr/`](./docs/adr/README.md) (template:
  [`adr-template.md`](./adr-template.md)). An ADR is immutable.

## Definition of Done

- [ ] Tests written and passing, CI green.
- [ ] API and database changes are backward compatible or versioned.
- [ ] Logs, metrics and tracing for the new path (where applicable).
- [ ] No secrets or PII.
- [ ] Names and conventions preserved; the boundaries (DS read-only, no router or `import.meta.env` in packages) intact.
- [ ] An ADR added, if this is an architecture decision.
- [ ] **Documentation updated in the same commit or PR — for EVERY change that should be reflected there** (`README.md` — running the project, commands, build status · `CLAUDE.md` — conventions, boundaries, commands · `docs/recipes/*` — processes · `docs/adr/*` — significant decisions · the DS inventory). Stale documentation means the change is not finished.
- [ ] PR description following [`pull-request-template.md`](./pull-request-template.md) (what/why, tests, risks, rollback).

## When something is unclear

If a requirement, an API contract or a convention is ambiguous — ask, or propose options with a
recommendation, instead of guessing and introducing an inconsistency.
