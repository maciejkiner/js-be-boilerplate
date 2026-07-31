# apps/api

Backend na **Fastify + Zod**. Moduły domenowe montowane z rejestru pod `/api/v1`.
Jedno źródło prawdy: schematy Zod tras napędzają walidację, serializację, typy i OpenAPI.

## Komendy

| Komenda               | Opis                                         |
| --------------------- | -------------------------------------------- |
| `pnpm dev`            | serwer w trybie watch (tsx)                  |
| `pnpm build`          | kompilacja do `dist/` (tsc)                  |
| `pnpm start`          | uruchomienie `dist/server.js`                |
| `pnpm typecheck`      | `tsc --noEmit`                               |
| `pnpm test`           | testy Vitest                                 |
| `pnpm test -- health` | pojedynczy plik/testy pasujące do wzorca     |
| `pnpm db:generate`    | wygeneruj migrację ze schematu (drizzle-kit) |
| `pnpm db:migrate`     | zastosuj migracje                            |
| `pnpm db:seed`        | uruchom seedery (idempotentne)               |
| `pnpm db:studio`      | Drizzle Studio                               |

Serwer wymaga zmiennych z `.env` (patrz `../../.env.example`); walidowane przy starcie (fail-fast).
Baza: `docker compose up -d` (Postgres). Testy integracyjne DB uruchamiają się, gdy ustawiony jest
`TEST_DATABASE_URL` (inaczej są pomijane).

## Endpointy

- `GET /health` — liveness probe (poza `/api/v1`; endpoint infrastrukturalny).
- `GET /api/v1/openapi.json` — spec OpenAPI generowany ze schematów (nigdy pisany ręcznie).
- **Auth** (`/api/v1/auth`): `register`, `login`, `refresh`, `logout`, `me`,
  `password-reset/request`, `password-reset/confirm`, `admin/ping` (przykład RBAC).
- Moduły domenowe: `/api/v1/*` (pierwszy w Fazie 4).

## Auth

- Email+hasło jako pierwsza implementacja **interfejsu providera tożsamości**
  (`modules/auth/providers/`); kolejni providerzy — patrz `docs/recipes/how-to-add-an-identity-provider.md`.
- **Sesje/tokeny**: access token (JWT, cookie `access_token`) + refresh token (opaque, hashowany
  w tabeli `sessions`, cookie `refresh_token`), rotowany przy `refresh`.
- **RBAC**: `roles` na userze; guard `requireRoles("admin")` po `app.authenticate`.
- **Reset hasła**: token e-mailem przez **abstrakcję mailera** (`lib/mailer`; dev = mailhog).
- **Admin na subdomenie**: CORS na `WEB_ORIGIN`+`ADMIN_ORIGIN` z credentials; cookies z opcjonalnym
  `COOKIE_DOMAIN`. Dla deploymentu w pełni cross-site potrzebny SameSite=None+Secure.
- Dev: `pnpm db:seed` tworzy `admin@example.com` / `admin12345`.

## Struktura

```
src/
  config/env.ts              — kontrakt env (Zod) + fail-fast parse
  db/
    client.ts                — createDb(url): Drizzle nad pulą pg
    columns.ts               — helpery kolumn: timestamps, softDelete, createdBy
    query.ts                 — notDeleted() (filtr soft-delete)
    schema.ts                — agregacja schematów modułów (kotwica scaffoldera)
    migrate.ts               — runMigrations() (no-op dopóki brak migracji)
    seed.ts                  — Seeder + rejestr seedów (idempotentne)
    cli/                     — db:migrate / db:seed
  lib/
    logger.ts                — opcje pino (JSON, redakcja wrażliwych nagłówków)
    http/
      problem.ts             — RFC 7807 + klasy AppError (NotFound, Conflict, …)
      error-handler.ts       — globalny handler → problem+json; notFoundHandler
      pagination.ts          — paginacja offset-based (konwencja list)
    error-tracking/          — ErrorTracker (interfejs) + noop / sentry (lazy)
    mailer/                  — Mailer (interfejs) + smtp (nodemailer) / memory
  modules/
    index.ts                 — rejestr modułów /api/v1 (kotwica scaffoldera)
    health/health.routes.ts  — /health
    auth/                    — schema, dto, service, repository, routes, rbac,
                               authenticate, cookies, tokens, providers/, seed
  app.ts                     — buildApp(): plugin-y, swagger, handlery, rejestr
  server.ts                  — start(): parse env → tracker → buildApp → listen
drizzle/                     — wygenerowane migracje (SQL + meta)
drizzle.config.ts            — konfiguracja drizzle-kit
```

## Konwencje

- **Moduł = katalog** w `src/modules/<nazwa>/`; trasy jako `FastifyPluginAsyncZod`.
  Rejestracja: jedna linia przy kotwicy `// scaffolder:entities-register` w `src/modules/index.ts`.
- **Błędy**: rzucaj podklasy `AppError` z warstwy logiki — globalny handler mapuje je na
  RFC 7807. Nie formatuj odpowiedzi błędu ręcznie. 5xx są logowane i raportowane do `ErrorTracker`.
- **Walidacja**: schematy Zod w `schema.{body,querystring,params,response}` tras.
- **Logi**: structured JSON (pino); `reqId` = correlation_id (nagłówek `x-request-id`).
- **OpenAPI**: patrz `docs/adr/ADR-0001-openapi-generation.md`.

Przepis dodania modułu: `docs/recipes/api-module-structure.md`.
