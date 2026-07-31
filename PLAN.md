[Home](./README.md) › [Documentation](./docs/README.md) › Build plan

# PLAN.md — TypeScript bootstrap (backend + frontend)

## Context

We are building a **bootstrap** (starter repository) for TypeScript backend + frontend projects. The
full, binding specification: [`spec/bootstrap-project-description.md`](./spec/bootstrap-project-description.md).
Every architectural decision in the specification is **settled** — do not propose alternatives (a
different ORM, an admin framework, a runtime engine instead of the scaffolder, and so on). Philosophy:
_a bootstrap, not a framework_ (fork & forget), _a generator, not a runtime engine_, _a single source
of truth = Zod schema + metadata_, _AI-first_, _convention over configuration_.

This file is the only source of truth about the state of the work. **A future session: read PLAN.md
and continue from the first unchecked task.** Do not run ahead of the phases — the dependencies are
real. At every `[DECISION]` point **stop and obtain the user's approval** before continuing.

## How to use this file

- Tasks are checkboxes `- [ ]`. Tick one when the phase's **Definition of Done** is met, not when the
  code is merely written.
- A phase is closed only with green CI, tests, and **AI documentation updated to the same extent**.
  Stale documentation means the phase is not finished.
- Do not implement anything from "Out of scope" or any opt-in module (recipes and interfaces only).
- Do not add functionality "just in case".

## Definition of Done — shared by EVERY phase

Beyond the phase-specific DoD, always:

- [ ] CI green (lint + typecheck + tests + build).
- [ ] Tests for the new functionality (Vitest; Playwright only from phase 6 onwards).
- [ ] AI documentation updated in the same PR (`CLAUDE.md` / `AGENTS.md` / recipes / the DS inventory) — conventions and boundaries described where they changed.
- [ ] Boundaries respected: **no** router imports (`@tanstack/react-router`) or bundler specifics (`import.meta.env`) inside `packages/`; the environment is injected explicitly. The `design-system/` directory is **read-only**.
- [ ] Naming and API conventions preserved (see CLAUDE.md).
- [ ] PR follows the template (what/why, tests, risks, rollback; from phase 9 also the "changelog entry" section).

## `[DECISION]` points (require the user's approval)

1. ✅ **APPROVED (2026-07-24) — the entity metadata format**: a companion map plus `defineEntity` in `packages/schemas` (Zod stays pure; a separate typed `fields` map keyed by the schema fields, with TypeScript enforcing coverage). `FieldMeta`: `label`, `control` (text/textarea/number/select/checkbox/radio/switch/date/relation), `options`, `relation {entity, displayField}`, `list {visible/sortable/filterable}`. Validation is NOT duplicated in the metadata (it follows from Zod); cross-field validation goes through `refine` on the entity. The database schema (Drizzle) is generated from the Zod type plus conventions.
2. **Phase 8 — the scaffolder contract**: the command interface, exactly what it generates and where it registers things (registries versus anchors). Design it and **stop** before writing the templates.
3. ✅ **APPROVED (2026-07-24) — the reference entity**: **Project + Task** (see assumption A).

## Assumptions (explicit — to be corrected by the user)

- **A. The reference entity (APPROVED 2026-07-24): `Project` + `Task`.**
  - **Project**: `name` (text), `description` (textarea), `status` (enum active/archived), `startDate` + `endDate` (date; **cross-field validation** endDate ≥ startDate).
  - **Task**: `title` (text), `description` (textarea), `status` (enum todo/in_progress/done), `priority` (enum), `dueDate` (date), `estimate` (number), `isBlocked` (boolean), `projectId` (one-to-many to Project — a generated → generated relation), `assigneeId` (a relation to the core `User` — an async combobox and the intersection with auth).
  - Admin filters: status and priority; sorting: dueDate. Audit columns and soft delete from the conventions.
  - **The reference wizard (phase 7)**: "create a project" in three steps — project data → invite members (e-mails to the mailer, NOT a table) → initial tasks (bulk). It proves the form engine is separate from CRUD (some data goes to the database, some to other handlers).
  - The backend slice (schemas + metadata, Drizzle, CRUD) is phase 4; the admin views are phase 6; forms and the wizard are phase 7.
- **B. Error tracking (Sentry behind an abstraction)** is wired in during phase 1 together with the global error handler — one cross-cutting entry point, not a separate phase. The dev adapter is a no-op/console, the production adapter is Sentry.
- **C. `AGENTS.md`** is kept as a thin pointer to `CLAUDE.md` (one source, no drift). The content of the folded-in `RULES.md` lands in `CLAUDE.md`; `RULES.md` is deleted. The `adr-template.md` and `pull-request-template.md` templates stay and keep evolving.
- **D. `design-system/`** is for now an ordinary placeholder directory (a mock on HTML primitives + Tailwind) at the path where the subtree will be mounted; the component interfaces follow the inventory in section 10 so that swapping in the real subtree does not disturb `packages/ui` or `packages/forms-ui`. The "DS read-only" rule applies from phase 0. Components are added just-in-time (phases 6 and 7), never in advance.
- **E. Pagination** is offset-based in core; cursor-based exists only as a recipe.
- **F. Keeping the AI documentation current** is enforced by an item in the PR template; an automatic CI check remains an open question (specification section 13) — we are not implementing it now.
- **G. Full-stack containerization (outside the phases, an organizational requirement).** `docker-compose.yml` stays infrastructure-only (native dev). The whole stack in containers is added through overlays: `docker-compose.app.yml` (prod-like) and `docker-compose.dev.yml` (HMR); Dockerfiles in `apps/*` plus `docker/`. It does not renumber the phases. Decision: **ADR-0002**; recipe: [`docs/recipes/how-to-run-in-docker.md`](./docs/recipes/how-to-run-in-docker.md).

---

## Phase 0 — Foundation (monorepo, config, DX, AI documentation)

Goal: the monorepo skeleton everything else stands on, plus the rules for agents from day one.

- [x] Monorepo initialisation: `pnpm` workspaces + Turborepo (`turbo.json` with the lint/typecheck/test/build pipeline). Node 22 LTS (`.nvmrc`, `engines`).
- [x] Directory structure per specification section 3: `apps/{api,web,admin}`, `packages/{schemas,api-client,api-react,forms,forms-ui,ui,config}`, `design-system/` (placeholders and READMEs at this stage).
- [x] `packages/config`: shared `tsconfig` (TS strict everywhere), ESLint (including the rule banning router imports and `import.meta.env` inside `packages/`), Prettier. Consumed by the root and the packages.
- [x] `docker-compose.yml`: Postgres + mailhog. `.env.example` documenting the variables.
- [x] CI skeleton (GitHub Actions): install → lint → typecheck → test → build on Turborepo.
- [x] AI documentation — the start:
  - [x] Fold `RULES.md` into `CLAUDE.md` (conventions, boundaries, priorities); delete `RULES.md`; keep `AGENTS.md` as a pointer to `CLAUDE.md` (assumption C).
  - [x] Record the hard boundaries in `CLAUDE.md`: "the DS is read-only", "no router and no `import.meta.env` inside `packages/`", the monorepo structure, the commands.
  - [x] A `docs/` directory for the recipes; `docs/adr/` using `adr-template.md`. A stub of the "DS component inventory" (section 10) in `design-system/` or `docs/`.
- [x] `design-system/README.md`: this is a placeholder for the future git subtree; **read-only**; how it will be swapped in (a draft of the "how to update the DS" recipe).

**DoD for phase 0:** `pnpm install` and `pnpm turbo run lint typecheck build` pass on the empty
skeleton; docker-compose comes up (Postgres + mailhog); CLAUDE.md and AGENTS.md describe the
structure, the commands and the boundaries; RULES.md is gone and its content moved.

## Phase 1 — API skeleton (Fastify + Zod, config, logging, errors, OpenAPI)

Goal: a working `apps/api` with the conventions in place, without any domain.

- [x] `apps/api` on Fastify + `fastify-type-provider-zod`; a modular structure (a directory is a module) plus a registry for mounting routers (`// scaffolder:routes — do not remove`).
- [x] Validated environment configuration (Zod) — parsed and failing fast at startup; typed environment.
- [x] Structured logging: pino (JSON, levels, `correlation_id`/request id).
- [x] A global error handler → **RFC 7807 (problem+json)**; consistent mapping of Zod validation errors and domain errors.
- [x] An error-tracking abstraction plus a Sentry adapter (assumption B); wired into the error handler; the dev adapter is a no-op/console.
- [x] The `/api/v1` convention (a path prefix, no extra machinery). A `/health` endpoint.
- [x] OpenAPI generated from the Zod schemas (`zod-openapi`) plus serving the specification (for example `/api/v1/openapi.json`). The specification is never written by hand.
- [x] List response conventions: the offset-based pagination shape (to be used from phase 4).
- [x] Vitest tests: config fail-fast, error mapping to 7807, the presence of `/health` and the OpenAPI spec.
- [x] A draft "API module structure" recipe plus a `CLAUDE.md` update (API conventions, error format, logging).

**DoD for phase 1:** the API starts with a validated environment; `/health` and OpenAPI work; errors
follow the 7807 format; logs are structured; tests are green.

## Phase 2 — Database (Drizzle, migrations, seeds, audit and soft-delete conventions)

Goal: the data layer and the conventions that auth and the reference entity will stand on.

- [x] Drizzle integration plus a Postgres connection built from the validated config.
- [x] A migration pipeline (generate + apply) wired into the scripts and CI (migrations against a test database).
- [x] The convention for **audit columns** (`createdAt`, `updatedAt`, `createdBy`) and **soft delete** (`deletedAt`) as a shared schema helper/mixin.
- [x] Seed infrastructure (idempotent).
- [x] The repository pattern: a thin data-access convention (no business logic in SQL).
- [x] Vitest tests: migrations apply; the audit/soft-delete helper works; the seed is idempotent.
- [x] A "how to add a migration" recipe plus a `CLAUDE.md` update (database conventions: audit, soft delete, expand → migrate → contract).

**DoD for phase 2:** migrations and seeds work locally and in CI; the audit and soft-delete
conventions are documented and covered by a test.

## Phase 3 — Auth (users, sessions/tokens, RBAC, identity provider, password reset)

Goal: non-optional auth (CRUD, the admin panel and `createdBy` all hang off it), with the modularity
boundary at the login method.

- [x] A users table (plus a migration) with audit columns.
- [x] Sessions and tokens **with refresh**; authorization middleware.
- [x] **The identity provider interface** plus the first implementation, **email + password** (hashing, login); a structure ready for further providers added in projects.
- [x] Simple **RBAC** (roles on the user) plus a guard on the endpoints.
- [x] **Password reset** → **the mailer abstraction** (dev adapter mailhog, production adapter). The mailer is an interface.
- [x] Support for **the admin on a subdomain from the start**: `.domain` cookies or tokens plus **CORS for two origins** (web + admin).
- [x] Auth endpoints under `/api/v1` plus OpenAPI entries.
- [x] Vitest tests: login/refresh, the RBAC guard, password reset (mail through mailhog/the adapter), CORS for two origins.
- [x] The **"how to add an identity provider"** recipe plus a `CLAUDE.md` update (auth, RBAC, the mailer, the subdomain/CORS model).

**DoD for phase 3:** the full email + password flow plus reset through mailhog; RBAC enforced;
sessions with refresh; the admin subdomain (cookies/CORS) handled; tests green.

## Phase 4 — The reference entity (backend slice) — model code written BY HAND

Goal: a complete entity module as the pattern the scaffolder will be extracted FROM (not the other way
round).

- [x] **[DECISION] #1 — the entity metadata format** (labels, column visibility and order, form field types, relation fields). Design a proposal extending the Zod schema, present it and **STOP for approval**. Confirm the choice of reference entity as well (assumption A / `[DECISION]` #3). → **Approved:** the `defineEntity` companion map (key parity enforced by the type), English labels; the reference entities are `Project` + `Task` (instead of `Product`/`Category`).
- [x] `packages/schemas`: the first Zod entity schema **plus metadata** (in the approved format). Pure TypeScript, no dependencies.
- [x] The entity's Drizzle schema (and that of a minimal related entity) plus a migration; audit columns and soft delete from the conventions.
- [x] CRUD endpoints in the domain module: list (**offset pagination + sorting + filtering by columns**), get, create, update, delete (soft). Request and response validation from the Zod schemas.
- [x] The **one-to-many** relation handled (many-to-many with attributes — outside the generator's scope, a manual recipe later).
- [x] OpenAPI entries generated from the schemas; the module registered in the router registry (an anchor).
- [x] Vitest tests: CRUD, pagination/sorting/filtering, validation, soft delete, `createdBy`.
- [x] The **"how to add an entity (step by step)"** recipe — written as a model document (the later scaffolder specification). A `CLAUDE.md` update.

**DoD for phase 4:** the reference entity works fully through the API (CRUD + pagination + filters)
from one source of truth (schema + metadata → Drizzle → validation → OpenAPI); tests green; the "how
to add an entity" recipe describes exactly this module.

## Phase 5 — The API client (generated from OpenAPI + React Query bindings)

Goal: type-safe API consumption from a single source of truth.

- [x] `packages/api-client`: a TypeScript client **generated from OpenAPI** (framework-agnostic, `fetch`; the environment and base URL injected explicitly — no `import.meta.env`). The generation script wired into the pipeline. → `openapi-typescript` (types) + `openapi-fetch` (runtime); `openapi.json` dumped from the schemas (`openapi:dump`, offline); a drift check in CI.
- [x] `packages/api-react`: **TanStack Query** bindings over the client (hooks per resource) — TanStack Query is allowed inside `packages/`. `ApiProvider` injects the client (the shell reads the environment).
- [x] Hooks for the reference entity (list/get/create/update/delete) as the pattern (`use{Projects,Tasks}` plus mutations invalidating the cache; query-option factories).
- [x] Vitest tests: the generated client matches the spec (a mock transport); the hooks (renderHook + jsdom).
- [x] A "how to regenerate the client after an API change" recipe plus a `CLAUDE.md` update.

**DoD for phase 5:** the client is generated from OpenAPI; the React Query hooks for the reference
entity work; the package boundary holds (no router, no bundler specifics); tests green.

## Phase 6 — Frontend shells + admin (Vite + React + TanStack Router), DataTable, e2e

Goal: thin `apps/web` and `apps/admin` shells on shared packages; the admin panel with the reference
entity's views. **Playwright (all of e2e) enters here.**

- [x] `apps/web` and `apps/admin`: Vite + React + TanStack Router; the environment injected into the packages explicitly when the shell starts. (stage B)
- [x] `apps/admin`: the admin layout plus a menu and routing **rendered from the entity/module registry** (an anchor for the scaffolder). (stage B)
- [x] Just-in-time additions to the mock DS from the section 10 inventory needed for the list and detail views: table primitives, pagination, modal, toast, skeleton/spinner (the DS read-only rule upheld). (stage A — `@repo/design-system`)
- [x] `packages/ui`: **DataTable** (pagination, sorting, filtering by columns), the admin layout, `EmptyState` — compositions **on** the DS. (stage A)
- [x] Admin views for the reference entity: list (DataTable), detail, delete (create/edit only after phase 7, or temporarily raw — see the DoD). (stage B — Project + Task)
- [x] **Playwright: configuration, CI wiring and the first e2e scenarios** (login, the reference entity's list and detail in the admin panel, verifying the two origins). (stage C — the `e2e` package, three green tests; configurable ports)
- [x] Tests: Vitest for `packages/ui`; Playwright e2e as above. → Vitest DS (9) + ui (6) green; e2e in stage C.
- [x] A "frontend shell structure / how to add a view" recipe plus a `CLAUDE.md` update (the React-yes/router-no boundary in practice). (stage B)

**DoD for phase 6:** web and admin start on the shared packages; the admin panel shows the reference
entity's list and detail through DataTable; e2e (login + admin) green in CI; no router or bundler
leakage into `packages/`.

## Phase 7 — The form engine (`packages/forms` headless + `packages/forms-ui`)

Goal: a headless engine plus renderers on the DS; the reference entity's form as the first consumer.

- [x] `packages/forms` (headless): a form definition (fields, per-field validation, cross-field validation, dependencies and conditional visibility, wizard steps) plus a submit handler that can be any function. No components. → `useForm` (Zod, per field + `refine`) and `useWizard` (steps, a multi-handler `onComplete`); conditional visibility through `visibleWhen` in `forms-ui`.
- [x] `packages/forms-ui`: renderers mapping **field type → DS component** (the mapping **explicit and documented**). Just-in-time additions of the DS field components: input, textarea, select, async-search combobox, checkbox, radio, switch, date picker, tabs/stepper. → all added to the DS mock; the mapping table lives in `packages/forms-ui/README.md`.
- [x] A CRUD form for the reference entity: the definition derived from the schema and metadata (phase 4), the handler saving through api-react (phase 5). Create/edit wired into the admin panel (phase 6). → Project + Task (create/edit) plus the "create a project" wizard.
- [x] Vitest tests: per-field and cross-field validation, conditional visibility, wizard steps, the field mapping; e2e (Playwright) create/edit of the reference entity. → forms 5 + forms-ui 6 + DS 16 + backend 4; e2e forms 4 (create/validation/edit/wizard).
- [x] A "how to define a form / add a field type" recipe plus the documented type → component mapping; a `CLAUDE.md` update.

**DoD for phase 7:** create/edit of the reference entity works through the form engine on the DS; the
type → component mapping is documented; save & resume is deliberately OMITTED (opt-in, a recipe only,
in phase 9); tests green.

## Phase 8 — The scaffolder (generalising the code from phases 4–7)

Goal: a generator extracted from existing model code — the templates come from the reference entity,
not the other way round.

- [x] **[DECISION] #2 — the scaffolder contract**. → **Approved:** "write the entity → generate the rest" (the generator reads the entity from `@repo/schemas`); it also generates CRUD tests. `tools/scaffold` (the CLI `pnpm scaffold <entity>`).
- [x] Templates produced by generalising the reference entity's module (phases 4–7) — parameterised by the schema and metadata. → `control` → Drizzle/Zod/component; sorting and filters from `list`; `required` from Zod.
- [x] The registry pattern plus anchors: the generator adds a single registration. **No AST parsing, no clever merging** — conventions and anchors; idempotent (stable deduplication). Anchors added: `entities-import`, `hooks-export`, `admin-import`.
- [x] Scope: **one-to-many — yes**; many-to-many with attributes — **outside the generator**; soft delete and audit — by default; upload and full-text search — out of scope.
- [x] Test: generating a new entity produces a module equivalent to the model. → verified with the `Widget` entity (a relation to project): typecheck, build, lint and format green, the migration fine, **the CRUD test 5/5 green**; the artefacts removed.
- [x] The **"how to add an entity"** recipe finalised alongside the generator (a "scaffolder" section plus a description of what it generates). Updates to `CLAUDE.md` and `tools/scaffold/README.md`.

**DoD for phase 8:** `add entity` generates a complete, working module end to end (backend + admin +
form + client) registered through the registries and anchors; the recipe and the generator describe
the same process and do not drift apart; tests green.

## Phase 9 — Wrap-up (recipe changelog, versioning, documentation, opt-in)

Goal: an update loop driven by instructions, a complete set of AI documentation, and recipes for the
opt-in modules (without implementing them).

- [x] `CHANGELOG.md`: the format of **recipe entries for an agent** (what/why/how to find it/what to do) plus the update loop.
- [x] `BOOTSTRAP_VERSION` (date + hash) — the marker of the starting version; it decides which entry to read from.
- [x] The PR template extended with a **"changelog entry"** section (`pull-request-template.md`).
- [x] A complete set of AI documentation: `CLAUDE.md`/`AGENTS.md`, a README per module, **the DS inventory with examples** (final), the recipes (add an entity / a provider / update the DS / regenerate the client / a form / docker).
- [x] **Opt-in module recipes — RECIPES AND INTERFACES ONLY, zero implementation**: `docs/recipes/opt-in/` (multi-tenancy, upload, save & resume, OpenTelemetry, queues/jobs).
- [x] The "cursor-based pagination" recipe (`docs/recipes/cursor-based-pagination.md`) complementing the offset-based one.

**DoD for phase 9:** the recipe changelog, `BOOTSTRAP_VERSION` and the PR template are ready; the AI
documentation is complete and consistent with the code; the opt-in modules exist only as recipes and
interfaces; everything explicitly out of scope is untouched.

---

## Out of scope (carried over from the specification — DO NOT violate in later sessions)

**Explicitly out of scope** (specification sections 2 and 6): payments, i18n, feature flags,
full-text search (filtering by columns is enough), social login in core (it is another identity
provider implemented in projects), SSR in the default frontend shell, **many-to-many with
attributes** on a join table inside the generator (a manual recipe only), AST parsing and clever
merging in the scaffolder.

**Opt-in modules — recipes and interfaces only, NEVER implemented in the bootstrap**: multi-tenancy,
file upload (a storage abstraction), save & resume for wizards, OpenTelemetry (tracing), queues and
background jobs.

**Hard rules at all times**: the DS is read-only; no router and no `import.meta.env` inside
`packages/`; the API is additive or versioned; the database goes expand → migrate → contract; no
functionality "just in case"; when something is unclear — ask the user rather than assume.

## Verification (how to check that it works)

- **Per phase**: `pnpm turbo run lint typecheck test build` green; docker-compose (Postgres + mailhog)
  up for the integration and e2e tests.
- **Phases 1–5**: Vitest (unit and integration) — the API, migrations, auth, the client.
- **Phase 6+**: additionally Playwright e2e (login, the admin list/detail/CRUD of the reference
  entity, the two origins).
- **Phase 8**: generate a test entity with the generator and confirm that the module compiles, the
  CRUD tests pass and the views and form work — equivalently to the reference entity.
- **Boundaries**: the lint rule in `packages/config` blocks router imports and `import.meta.env`
  inside `packages/`; a leak surfaces immediately thanks to `apps/admin` running on the same packages.
