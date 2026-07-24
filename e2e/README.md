# e2e

Testy end-to-end (Playwright) całego stacku: API + `web` + `admin` na jednej bazie. Poza
pipeline'em unit (`turbo run test`) — własny skrypt, bo wymaga uruchomionych serwerów i bazy.

## Uruchomienie

```bash
# pierwszy raz: przeglądarka
pnpm --filter @repo/e2e exec playwright install chromium

# Playwright sam startuje API (dev), web i admin; wymaga DATABASE_URL
DATABASE_URL="postgres://app:app@localhost:5432/app" pnpm --filter @repo/e2e test:e2e
```

Playwright startuje trzy serwery (`webServer[]`), czeka na `/health` + skorupy, potem odpala testy.
Migracje robi API na starcie. Użytkownik i dane testowe powstają przez API w helperach
(`tests/helpers.ts`) — testy są samowystarczalne.

## Porty (kolizje z innymi projektami)

Domyślne: API 3000, web 5173, admin 5174. Nadpisz przy kolizji:

```bash
E2E_API_PORT=3100 E2E_WEB_PORT=5273 E2E_ADMIN_PORT=5274 \
  DATABASE_URL="postgres://app:app@localhost:5434/app" pnpm --filter @repo/e2e test:e2e
```

## Scenariusze

- `two-origins.spec.ts` — web i admin to osobne skorupy; admin bez sesji → `/login`.
- `admin.spec.ts` — login przez UI → pulpit; lista (DataTable) + detal encji referencyjnej.

CI: krok „E2E (Playwright)" po lint/typecheck/build/test, na tym samym service'ie Postgres.
