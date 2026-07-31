# js-be-boilerplate

A bootstrap (starter repository) for TypeScript **backend + frontend** projects. The goal: cut the
first weeks of a project down to days, without giving up ownership of the code. Philosophy:
_a bootstrap, not a framework_ (fork & forget), _a generator, not a runtime engine_, _a single source
of truth_ (Zod schema + metadata), _AI-first_, _convention over configuration_.

**New here?** Start with [Getting started](#getting-started), then browse the
[documentation map](./docs/README.md).

## Documentation

Every document links back to its index, so you can click your way through the whole set on GitHub.

| Where                                                     | What you will find                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| [Documentation map](./docs/README.md)                     | The full index — every document in the repository, grouped by purpose |
| [Recipes](./docs/recipes/README.md)                       | Step-by-step procedures: add an entity, a migration, a form, …        |
| [Architecture decisions](./docs/adr/README.md)            | ADRs — why things are the way they are                                |
| [Conventions for the team and AI agents](./CLAUDE.md)     | The canonical rules: commands, boundaries, Definition of Done          |
| [Project specification](./spec/bootstrap-project-description.md) | The binding spec this repository implements                     |
| [Build plan and status](./PLAN.md)                        | Phases, checkboxes, what is intentionally out of scope                 |
| [Changelog](./CHANGELOG.md)                               | Backport recipes for forks that have already drifted                   |

Per-workspace documentation lives next to the code:

| Workspace                                                | Purpose                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| [`apps/api`](./apps/api/README.md)                       | Fastify + Zod API, domain modules, OpenAPI                     |
| [`apps/web`](./apps/web/README.md)                       | Public shell (Vite + React + TanStack Router)                  |
| [`apps/admin`](./apps/admin/README.md)                   | Admin panel — the second shell on the same packages            |
| [`packages/schemas`](./packages/schemas/README.md)       | Entities: Zod schema + metadata (the single source of truth)   |
| [`packages/api-client`](./packages/api-client/README.md) | Type-safe client generated from OpenAPI                        |
| [`packages/api-react`](./packages/api-react/README.md)   | TanStack Query bindings over the client                        |
| [`packages/forms`](./packages/forms/README.md)           | Headless form engine (`useForm`, `useWizard`)                  |
| [`packages/forms-ui`](./packages/forms-ui/README.md)     | Field renderers wired to the design system                     |
| [`packages/ui`](./packages/ui/README.md)                 | Compositions on the design system: `DataTable`, `AdminLayout`  |
| [`tools/scaffold`](./tools/scaffold/README.md)           | Entity generator (`pnpm scaffold <entity>`)                    |
| [`e2e`](./e2e/README.md)                                 | End-to-end tests (Playwright)                                  |

## Build status

| Phase | Scope                                                     | Status      |
| ----- | --------------------------------------------------------- | ----------- |
| 0     | Foundation: monorepo, config, DX, AI docs                 | ✅ complete |
| 1     | API skeleton (Fastify + Zod, env, logging, RFC 7807)      | ✅ complete |
| 2     | Database (Drizzle, migrations, audit columns, soft delete) | ✅ complete |
| 3     | Auth (users, sessions, RBAC, password reset)              | ✅ complete |
| 4     | Reference entity (Project + Task, CRUD)                   | ✅ complete |
| 5     | API client from OpenAPI + TanStack Query hooks            | ✅ complete |
| 6     | Web + admin shells, DataTable, e2e (Playwright)           | ✅ complete |
| 7     | Form engine (`forms` + `forms-ui`) + wizard               | ✅ complete |
| 8     | Scaffolder (`pnpm scaffold` — entity generation)          | ✅ complete |
| 9     | Wrap-up (changelog, versioning, opt-in modules)           | ✅ complete |

**The bootstrap is complete** (phases 0–9). Updates reach forks through `CHANGELOG.md` (recipe
entries) + `BOOTSTRAP_VERSION`. Opt-in modules ship as recipes only:
[`docs/recipes/opt-in/`](./docs/recipes/opt-in/README.md).

Outside the phases: **full-stack containerization**
([ADR-0002](./docs/adr/ADR-0002-full-stack-containerization.md)) — see [Running the stack](#running-the-stack).
Details and checkboxes: [`PLAN.md`](./PLAN.md).

## Getting started

**Fork & forget**: your project *owns* its code; updates from the boilerplate arrive as recipe
entries in [`CHANGELOG.md`](./CHANGELOG.md) + `BOOTSTRAP_VERSION`, **not** through `git merge`.

1. **Create the repository** from this one (not a classic fork): GitHub → **"Use this template" →
   Create a new repository** (clean history, full ownership). For an organization: enable
   Settings → **Template repository** here, and every new project is one click away.
2. **Clone it:** `git clone <project-repo> && cd <project>`.

### Configuration (BEFORE the first run)

- **`.env`:** `cp .env.example .env`, then set:
  - a real **`JWT_SECRET`** (`openssl rand -hex 32`) — required, the API fails fast without it;
  - **`COMPOSE_PROJECT_NAME=<project>`** — isolates containers and ports from other projects;
  - per environment: `SENTRY_DSN`, `COOKIE_DOMAIN`/`COOKIE_SECURE`, and `*_PORT`/`*_ORIGIN` on port
    collisions.
  - `.env` **never** goes into the repository.
- **Dependencies:** `pnpm install`.

Only now start the stack (see [Running the stack](#running-the-stack)): `pnpm docker:full` +
`pnpm docker:full:seed`.

### Cleanup (once it runs)

- **Identity:** `name` in the root `package.json`; title and description in `README.md`.
- **Reference entities `Project`/`Task`:** they are the pattern the scaffolder follows — add your own
  (`pnpm scaffold <entity>`) and delete what you do not need (API module + `packages/schemas` +
  admin views + hooks + the entries at the `// scaffolder:…` anchors).
- **`PLAN.md`:** replace it with your project roadmap (or delete it). `CLAUDE.md` stays as the
  canonical reference for the team and for AI agents.
- **`BOOTSTRAP_VERSION`:** keep it — it records the starting version; future fixes come from
  `CHANGELOG.md`.

## Requirements

- **Node 22 LTS** (see `.nvmrc`), **pnpm** (`corepack enable`)
- **Docker** (Postgres + mailhog; optionally the whole stack — see below)

## Running the stack

Seeded account: **`admin@example.com` / `admin12345`**. Default addresses: admin
`http://localhost:5174` · web `http://localhost:5173` · API `http://localhost:3000/health` ·
mailhog inbox `http://localhost:8025`. Ports already taken? Set them in `.env`: for the Docker modes
`API_PORT`/`WEB_PORT`/`ADMIN_PORT` (Postgres is **not** published to the host, so it cannot collide
with a local 5432); for native development `POSTGRES_PORT`. See `.env.example`.

### Option 1 — the whole stack in Docker (one command)

```bash
cp .env.example .env
pnpm docker:full        # Postgres + mailhog + API + web + admin (builds images, prod-like)
pnpm docker:full:seed   # creates the admin account (admin@example.com / admin12345)
```

### Option 2 — working inside containers (HMR, live editing)

```bash
pnpm docker:dev         # as above, but API/web/admin run in watch mode (source bind-mounted)
# seed (once):
docker compose -f docker-compose.dev.yml exec api pnpm db:seed
```

### Option 3 — native development (fastest DX, app outside containers)

```bash
cp .env.example .env
pnpm install
docker compose up -d                    # infrastructure only: Postgres + mailhog
pnpm --filter @repo/api db:migrate      # migrations
pnpm --filter @repo/api db:seed         # admin account
pnpm dev                                # API :3000, web :5173, admin :5174 + package watchers
```

`pnpm dev` also starts `tsc -w` for the library packages (`schemas`, `forms`, `forms-ui`, `ui`,
`api-client`, `api-react`). Without those watchers a change in `packages/*` never reaches the shells,
because they consume `dist` — Vite HMR only sees application code. You can still start a single app
with a filter (`pnpm --filter @repo/admin dev`), but then remember to run `pnpm build` after touching
a package.

Full description of the Docker modes and their pitfalls:
[`docs/recipes/how-to-run-in-docker.md`](./docs/recipes/how-to-run-in-docker.md).

## Commands

| Command                                         | Description                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| `pnpm lint` / `typecheck` / `build` / `test`     | The pipeline through Turborepo (whole monorepo)         |
| `pnpm format` / `pnpm format:check`             | Prettier                                                |
| `pnpm turbo run test --filter=@repo/<pkg>`      | Narrow any task to a single workspace                   |
| `pnpm dev`                                      | Everything in watch mode (apps + package `dist`)        |
| `pnpm --filter @repo/{api,web,admin} dev`       | A single application (without package watchers)         |
| `pnpm generate:client`                          | Regenerate the client from OpenAPI (after API changes)  |
| `pnpm --filter @repo/e2e test:e2e`              | End-to-end tests (Playwright starts API + web + admin)  |
| `pnpm docker:up` / `docker:full` / `docker:dev` | Infrastructure / prod-like stack / HMR stack            |
| `pnpm scaffold <entity>`                        | Generates an entity (API + admin + hooks + test)        |

Database and API integration tests, as well as e2e, require Postgres
(`TEST_DATABASE_URL`/`DATABASE_URL`). E2E additionally needs SMTP on `localhost:1025` (the wizard
sends invitations through the mailer) — locally `pnpm docker:up` provides it (mailhog). The admin
account is created by `e2e/global-setup.ts` (idempotent seed).

## Structure

```
apps/       api (Fastify+Zod) · web · admin  (shells: Vite + React + TanStack Router)
packages/   schemas · api-client · api-react · ui · config · forms · forms-ui
design-system/   the DS as a git subtree (Tailwind mock; READ-ONLY) — silk in the long run
e2e/        end-to-end tests (Playwright)
tools/      scaffold (entity generator: `pnpm scaffold <entity>`)
docs/       recipes · adr/ · ds-component-inventory.md · ds-gap-analysis.md
spec/       project specification
```

**Hard boundaries** (enforced by lint and review): `design-system/` is read-only; inside `packages/`
router imports and `import.meta.env` are forbidden (env and router belong to the `apps/*` shells).
Details in [`CLAUDE.md`](./CLAUDE.md).
