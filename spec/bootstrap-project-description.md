[Home](../README.md) › [Documentation](../docs/README.md) › Project specification

# TypeScript bootstrap (backend + frontend) — project description

## 1. Goal and philosophy

A starter repository for new projects on a TypeScript stack, covering the functionality most
applications share: an API with authorization, an admin panel with CRUD generated from the data
schemas, and a form engine. The goal is to cut the first weeks of a project down to days while the
project retains full ownership of the code.

Overriding principles:

- **A bootstrap, not a framework.** Projects start by copying the repository and are cut off from
  that moment on (fork & forget). There is no technical dependency between the bootstrap and the
  projects — the only feedback channel is a changelog of migration recipes (section 12).
- **A generator, not a runtime engine.** CRUD, admin views and forms are scaffolded as ordinary code
  that the project takes ownership of and modifies freely. We deliberately reject the declarative
  engine interpreted on the fly (the Django admin / Strapi / React-Admin style), because every project
  eventually hits a case the engine did not foresee.
- **A single source of truth for the shape of the data.** An entity is defined once (a Zod schema plus
  metadata) and drives the database schema and migrations, backend and frontend validation, types, the
  OpenAPI specification, the API client, the admin table columns and the forms.
- **AI-first.** The structure, the conventions and the documentation are designed so that an AI agent
  can navigate the repository on its own, add entities by following the recipes and apply fixes from
  the changelog. Everything that helps the generator (a predictable structure, registries, conventions
  instead of magic) helps agents too — and vice versa.
- **Convention over configuration.** A directory is a module, files have known shapes, discovery
  happens through registries.
- **The scope criterion.** A feature belongs in core if (a) the vast majority of projects need it,
  (b) it can be implemented without domain knowledge, and (c) it does not force a business decision on
  a future project. If any of those fails, it is an opt-in module or stays out of scope.

## 2. Functional scope

### Core (always in the project)

- A REST API structure with conventions: the error format, pagination, versioning (section 8).
- An OpenAPI specification generated from the Zod schemas plus a generated TypeScript client.
- Auth: a users table, sessions and tokens, authorization middleware, simple RBAC (roles on the user),
  password reset. Email + password is the first implementation of the identity provider interface
  (section 7).
- A mailer abstraction (implied by password reset) with a dev adapter (mailhog) and a production one.
- A CRUD scaffolder: generating an entity module (schema, migration, endpoints, validation, admin
  views) from a Zod definition (section 6).
- An admin panel: our own implementation on our design system, deployable separately (for example on a
  subdomain); a list with pagination, sorting and filtering by columns, create/edit forms, a detail
  view, deletion.
- A headless form engine plus renderers on the design system (section 9).
- Audit columns (createdAt, updatedAt, createdBy) and soft delete as a scaffolder convention.
- DX infrastructure: validated environment configuration, structured logging (pino), global error
  handling mapped onto API responses, migrations and seeds, docker-compose (Postgres + mailhog), CI
  (GitHub Actions), unit tests (Vitest) and e2e tests (Playwright).
- Error tracking behind an abstraction with a Sentry adapter (the vendor is replaceable).
- AI documentation: CLAUDE.md / AGENTS.md, the recipes, the DS component inventory (section 11).

### Opt-in modules (in the repository or documented as a recipe, enabled deliberately)

- Multi-tenancy (organizations, invitations, per-organization roles) — decided when a project starts,
  because it touches the database schema and is painful to bolt on later.
- File upload with a storage abstraction.
- Save & resume for wizards (persisting partial form state).
- OpenTelemetry (tracing).
- Queues and background jobs.

### Explicitly out of scope

- Payments, i18n, feature flags, full-text search, social login (implemented in projects as further
  identity providers), SSR in the default frontend shell.

## 3. Monorepo structure

```
apps/
  api        — Fastify, domain modules, mounted from a registry
  web        — the default shell: Vite + React + TanStack Router
  admin      — the admin panel, separately deployable (subdomain)
packages/
  schemas    — Zod schemas for entities and forms; pure TS, zero dependencies
  api-client — the client generated from OpenAPI; framework-agnostic (fetch)
  api-react  — TanStack Query bindings over the client (hooks per resource)
  forms      — the headless form engine (state, validation, steps, dependencies)
  forms-ui   — field renderers wired to the design system
  ui         — compositions on the DS: DataTable, the admin layout, EmptyState, …
  config     — shared ESLint / Prettier / tsconfig
design-system/  — our DS as a git subtree (section 10)
```

The consequences of a separate `apps/admin` on a subdomain, handled from day one: cookies scoped to
the parent domain (or tokens), CORS for two origins, and shared `packages/ui` and `packages/api-client`
so that web and admin do not diverge in the basics.

## 4. Replaceability of the frontend engine

On the frontend the bootstrap's value lives in `packages/`, while `apps/web` is a thin shell (routing,
layout, assembling the pieces). A project that needs SSR stands up its own shell (Next, say) and
imports the same packages — what gets replaced is the shell, not the investment.

The boundary is enforced in review: **React yes, the router and bundler specifics no.** Inside
`packages/` imports from a router (for example `@tanstack/react-router`) and bundler APIs (for example
`import.meta.env` — the environment is passed explicitly at initialisation) are forbidden. TanStack
Query is allowed (it behaves identically in every shell). We do not aim for React-agnosticism: React
is a safe assumption, and full agnosticism would double the cost with no real gain.

`apps/admin`, as a second shell on the same packages, acts as a permanent test of that boundary —
leaked specifics surface immediately.

## 5. Stack

| Layer            | Choice                                              | Rationale (one sentence)                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime          | Node 22 LTS, pnpm workspaces, Turborepo             | Boring and predictable; the ecosystem beats novelty.                                                                                                                                                                        |
| Language         | TypeScript strict everywhere                        | Shared configs in `packages/config`.                                                                                                                                                                                        |
| Database         | PostgreSQL                                          | Not up for discussion.                                                                                                                                                                                                      |
| ORM              | Drizzle                                             | The schema is TypeScript code — easier for the scaffolder and for agents to generate and transform than a separate DSL.                                                                                                     |
| Backend          | Fastify + Zod (`fastify-type-provider-zod`)         | Zod closes the single-source-of-truth loop: request/response validation, types, OpenAPI, frontend validation, form definitions; the modular structure is our thin convention instead of heavy framework machinery.           |
| API              | REST + OpenAPI (`zod-openapi`) + a generated client | Universal for future non-TypeScript consumers; type safety is recovered through the generated client.                                                                                                                       |
| Frontend (shell) | Vite + React + TanStack Router + TanStack Query     | One execution world (no SSR), fast development, readable for agents.                                                                                                                                                        |
| UI               | Our design system (git subtree) + `packages/ui`     | Compositions built _on_ the DS, not beside it.                                                                                                                                                                              |
| Tests            | Vitest (unit) + Playwright (e2e)                    | —                                                                                                                                                                                                                           |
| Dev environment  | docker-compose: Postgres + mailhog                  | —                                                                                                                                                                                                                           |
| Logging          | pino (structured)                                   | —                                                                                                                                                                                                                           |
| Error tracking   | an abstraction + a Sentry adapter                   | The vendor is replaceable.                                                                                                                                                                                                  |
| CI               | GitHub Actions                                      | —                                                                                                                                                                                                                           |

## 6. The scaffolder and its contract

The "add an entity" task generates a complete module: a Zod schema with metadata → a Drizzle schema
plus a migration → CRUD endpoints with validation → entries in the OpenAPI specification → admin views
(list, form, detail).

The impact on existing files is minimised by the **registry pattern**: the admin menu, the routing and
the mounting of backend routers all render from entity and module registries, so the generator adds a
single registration (a line in an index file, or a file in a conventional directory that is collected
automatically). Where code really has to be injected into the middle of a file we use anchor comments
(`// scaffolder:entities — do not remove`). We deliberately forgo AST parsing and clever merging —
conventions plus anchors cover the vast majority of cases, and the rest is described in the recipes and
can be carried out by an agent manually.

CRUD scope: one-to-many relations — yes; many-to-many with attributes on a join table — outside the
generator (a manual recipe); soft delete and audit columns — by default; file upload — an opt-in
module; full-text search — out of scope (filtering by columns is enough).

The generated code is at the same time **a reference usage of the design system and the conventions** —
it teaches the patterns to everyone who reads it, human or agent. That raises the quality bar for the
templates.

## 7. Auth

Core contains: a users table, sessions and tokens (with refresh), authorization middleware, simple
RBAC and password reset (→ the mailer). What is modular is **the login method**: the boundary runs
through the identity provider interface, not through auth as a whole. Email + password is the first
implementation of that interface in core; social login and other providers are further implementations
added in projects. Auth cannot be optional in the schema — the CRUD admin and `createdBy` hang off it.

Auth supports an admin on a subdomain from the start (`.domain` cookies or tokens, CORS for two
origins).

## 8. API conventions

- An error format based on RFC 7807 (problem+json), consistent with the global error handler.
- Pagination: offset-based in core (simpler, sufficient for the admin panel); cursor-based as a recipe
  for public lists.
- Versioning: `/api/v1` as a path convention, without extra machinery.
- The OpenAPI specification is generated from the Zod schemas — never written by hand; the
  documentation and the client both come from it.

## 9. The form engine

A form is a **definition** (fields, per-field validation, cross-field validation, dependencies and
conditional visibility, wizard steps) plus a **submit handler** that is any function. A CRUD form is a
special case: the definition is derived from the entity schema and the handler writes to the database.
A wizard collecting data for an external API uses the same engine with a different handler — form data
may, but need not, reach the database.

The engine (`packages/forms`) is headless: logic and contract without components. The renderers
(`packages/forms-ui`) map field types onto design-system components; the "field type → DS component"
mapping is explicit and documented. Save & resume for wizards is an opt-in module (it drags in
persistence of partial state).

## 10. Design system

Distribution: a **git subtree** in the repository. Consequences: the DS code is physically present
(an agent reads the sources instead of guessing the API; no private registry configuration in CI), and
updates happen through `git subtree pull`, documented as a recipe.

A hard rule, written into the files agents read: **the DS directory is read-only in a project.**
Changes go upstream into the DS repository, or through the `packages/ui` layer. Without that rule,
locally "fixing" a component quietly creates a fork.

Required component coverage (the vocabulary for generators; gaps are filled in the DS before the
scaffolder templates are written): input, textarea, select, combobox with async search (relation
fields), checkbox, radio, switch, date picker, a table or table primitives, modal/dialog, toast,
pagination, tabs/stepper (wizards), skeleton/spinner.

## 11. AI compatibility

- `CLAUDE.md` / `AGENTS.md` at the root: architecture, commands, conventions, boundaries (for example
  "the DS is read-only", "no router and no import.meta.env inside packages/").
- Short per-module READMEs wherever a module carries non-obvious rules.
- **Recipes** ("how to add an entity step by step", "how to add an identity provider", "how to update
  the DS") — one document that is simultaneously documentation for a human, an instruction for an
  agent and the scaffolder's specification; since they describe the same process, they cannot drift
  apart. Some recipes may be shipped as agent commands or skills.
- A DS component inventory with usage examples — so that agents do not hallucinate APIs or smuggle raw
  HTML in next to the DS.
- Documentation treated as code: updated in the same pull requests that change the conventions, with
  an item in the PR template (eventually a CI check). A stale file for an agent is worse than no file.

## 12. The update loop: the changelog as recipes

Projects are cut off once they start — there is no upstream merging, no versioned framework packages
and no synchronisation tooling. Instead there is **a loop through instructions, not through code**:

- The bootstrap maintains `CHANGELOG.md`, where entries are migration recipes written for an agent:
  what was fixed, why, how to find the relevant fragment in the project and what to replace it with.
- A project applies a fix by handing the entry to an agent (or with a command such as "check the
  bootstrap changelog since our start date and apply what is relevant"). The agent applies the change
  to diverged code because it understands the intent, not a diff — conflicts stop being a problem.
- The `BOOTSTRAP_VERSION` file (date/hash) stamped in when the project started decides which entry to
  read from.
- The cost on the bootstrap side: a "changelog entry" section in the PR template. The main gain: a
  channel for security fixes (a hole in the bootstrap's auth is a hole in every project) and for bugs
  in code produced by the scaffolder.

## 13. Open questions

- Verifying the DS component coverage against the list in section 10 (in progress; the DS will be
  brought up to the required state).
- The format of entity metadata extending the Zod schema (labels, column visibility, form field
  types) — to be designed while implementing the scaffolder.
- The eventual CI check that keeps the AI documentation current.

## Related

- [`PLAN.md`](../PLAN.md) — how this specification was turned into phases, and where they stand
- [`CLAUDE.md`](../CLAUDE.md) — the conventions that implement it
- [Documentation map](../docs/README.md) — every document in the repository
