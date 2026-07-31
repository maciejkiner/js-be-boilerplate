[Home](../README.md) › [Documentation](../docs/README.md) › e2e

# e2e

End-to-end tests (Playwright) covering the whole stack: API + `web` + `admin` against one database.
They sit outside the unit pipeline (`turbo run test`) and have their own script, because they need
running servers and a database.

## Running them

```bash
# first time: install the browser
pnpm --filter @repo/e2e exec playwright install chromium

# Playwright starts the API (dev), web and admin itself; it needs DATABASE_URL
DATABASE_URL="postgres://app:app@localhost:5432/app" pnpm --filter @repo/e2e test:e2e
```

Playwright starts three servers (`webServer[]`), waits for `/health` and both shells, then runs the
tests. Migrations are applied by the API on startup. `global-setup.ts` seeds the admin account
(idempotent) — the admin-only views cannot be reached without it. Everything else is created through
the API in the helpers (`tests/helpers.ts`), so the tests are self-sufficient.

**SMTP is required**: the project wizard sends invitations through the mailer, and `SmtpMailer`
without a server responds 500. Locally `pnpm docker:up` provides mailhog on 1025; CI runs a mailhog
service.

## Ports (collisions with other projects)

Defaults: API 3000, web 5173, admin 5174. Override them on a collision:

```bash
E2E_API_PORT=3100 E2E_WEB_PORT=5273 E2E_ADMIN_PORT=5274 \
  DATABASE_URL="postgres://app:app@localhost:5434/app" pnpm --filter @repo/e2e test:e2e
```

## Scenarios

- `two-origins.spec.ts` — web and admin are separate shells; admin without a session redirects to
  `/login`.
- `admin.spec.ts` — logging in through the UI leads to the dashboard; the list (DataTable) and the
  detail page of the reference entity.
- `forms.spec.ts` — create, edit and the three-step wizard (the form engine end to end).
- `api-errors.spec.ts` — an API error reaches the user: a 409 lands on the field it concerns and in
  the global message.

CI runs an "E2E (Playwright)" step after lint, typecheck, build and test, against the same Postgres
service.

## Related

- [`apps/api`](../apps/api/README.md) — the server under test
- [`apps/admin`](../apps/admin/README.md) — the shell most scenarios drive
- [How to define a form](../docs/recipes/how-to-define-a-form.md) — the behaviour `forms.spec.ts` locks in
- [How to run in Docker](../docs/recipes/how-to-run-in-docker.md) — bringing up Postgres and mailhog
