[Home](../../README.md) › [Documentation](../../docs/README.md) › apps/api

# apps/api

The backend: **Fastify + Zod**. Domain modules are mounted from a registry under `/api/v1`. Single
source of truth: the Zod route schemas drive validation, serialization, types and OpenAPI.

## Commands

| Command               | Description                                        |
| --------------------- | -------------------------------------------------- |
| `pnpm dev`            | Server in watch mode (tsx)                         |
| `pnpm build`          | Compile to `dist/` (tsc)                           |
| `pnpm start`          | Run `dist/server.js`                               |
| `pnpm typecheck`      | `tsc --noEmit`                                     |
| `pnpm test`           | Vitest                                             |
| `pnpm test -- health` | A single file, or the tests matching a pattern     |
| `pnpm db:generate`    | Generate a migration from the schema (drizzle-kit) |
| `pnpm db:migrate`     | Apply migrations                                   |
| `pnpm db:seed`        | Run the seeders (idempotent)                       |
| `pnpm db:studio`      | Drizzle Studio                                     |

The server needs the variables from `.env` (see [`.env.example`](../../.env.example)); they are
validated at startup and the process fails fast. Database: `docker compose up -d` (Postgres).
Database integration tests run when `TEST_DATABASE_URL` is set, and are skipped otherwise.

## Endpoints

- `GET /health` — liveness probe (outside `/api/v1`; infrastructure, not a versioned API).
- `GET /api/v1/openapi.json` — the OpenAPI spec generated from the schemas, never hand-written.
- **Auth** (`/api/v1/auth`): `register`, `login`, `refresh`, `logout`, `me`,
  `password-reset/request`, `password-reset/confirm`, `admin/ping` (an RBAC example).
- Domain modules: `/api/v1/*`.

## Auth

- Email + password is the first implementation of the **identity provider interface**
  (`modules/auth/providers/`); for further providers see
  [How to add an identity provider](../../docs/recipes/how-to-add-an-identity-provider.md).
- **Sessions and tokens**: an access token (JWT in the `access_token` cookie) plus a refresh token
  (opaque, stored hashed in the `sessions` table, in the `refresh_token` cookie), rotated on
  `refresh`.
- **RBAC**: `roles` on the user; the `requireRoles("admin")` guard runs after `app.authenticate`.
- **Password reset**: a token sent by e-mail through the **mailer abstraction** (`lib/mailer`; the dev
  adapter is mailhog).
- **Admin on a subdomain**: CORS for `WEB_ORIGIN` + `ADMIN_ORIGIN` with credentials; cookies with an
  optional `COOKIE_DOMAIN`. A fully cross-site deployment additionally needs SameSite=None + Secure.
- Dev: `pnpm db:seed` creates `admin@example.com` / `admin12345`.

## Structure

```
src/
  config/env.ts              — the env contract (Zod) + fail-fast parsing
  db/
    client.ts                — createDb(url): Drizzle over a pg pool
    columns.ts               — column helpers: timestamps, softDelete, createdBy
    query.ts                 — notDeleted() (the soft-delete filter)
    unique-violation.ts      — a Postgres unique violation → a 409 naming the fields
    schema.ts                — aggregates the module schemas (scaffolder anchor)
    migrate.ts               — runMigrations()
    seed.ts                  — Seeder + the seed registry (idempotent)
    cli/                     — db:migrate / db:seed
  lib/
    logger.ts                — pino options (JSON, sensitive headers redacted)
    http/
      problem.ts             — RFC 7807 + the AppError classes (NotFound, Conflict, …)
      error-handler.ts       — the global handler → problem+json; notFoundHandler
      pagination.ts          — offset-based pagination (the list convention)
    error-tracking/          — ErrorTracker (interface) + noop / sentry (lazy)
    mailer/                  — Mailer (interface) + smtp (nodemailer) / memory
  modules/
    index.ts                 — the /api/v1 module registry (scaffolder anchor)
    health/health.routes.ts  — /health
    auth/                    — schema, dto, service, repository, routes, rbac,
                               authenticate, cookies, tokens, providers/, seed
  app.ts                     — buildApp(): plugins, swagger, handlers, the registry
  server.ts                  — start(): parse env → tracker → buildApp → listen
drizzle/                     — generated migrations (SQL + meta)
drizzle.config.ts            — drizzle-kit configuration
```

## Conventions

- **A module is a directory** under `src/modules/<name>/`; routes are a `FastifyPluginAsyncZod`.
  Registration is one line at the `// scaffolder:entities-register` anchor in `src/modules/index.ts`.
- **Errors**: throw `AppError` subclasses from the logic layer — the global handler maps them to
  RFC 7807. Never format an error response by hand. 5xx responses are logged and reported to the
  `ErrorTracker`. An error concerning specific fields carries the `errors` extension
  (`[{ path, message }]`), which is what lets a form highlight the offending control.
- **Validation**: Zod schemas in the routes' `schema.{body,querystring,params,response}`.
- **Logs**: structured JSON (pino); `reqId` is the correlation id (from the `x-request-id` header).
- **OpenAPI**: see [ADR-0001](../../docs/adr/ADR-0001-openapi-generation.md).

## Related

- [API module structure](../../docs/recipes/api-module-structure.md) — adding a module by hand
- [How to add an entity](../../docs/recipes/how-to-add-an-entity.md) — generating one instead
- [How to add a migration](../../docs/recipes/how-to-add-a-migration.md) — the data layer
- [How to regenerate the API client](../../docs/recipes/how-to-regenerate-the-api-client.md) — what the frontend consumes
- [`packages/schemas`](../../packages/schemas/README.md) — where entities are defined
