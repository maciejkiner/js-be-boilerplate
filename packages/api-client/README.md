# packages/api-client

Type-safe klient API **generowany z OpenAPI**. Framework-agnostic (`fetch`), bez routera i
`import.meta.env` — `baseUrl` wstrzykiwany jawnie przez skorupę.

## Model

- `src/generated/schema.d.ts` — **typy generowane** z `apps/api/openapi.json` (nie edytuj ręcznie).
- `createApiClient({ baseUrl, fetch?, headers? })` — zwraca klienta `openapi-fetch` z metodami
  `GET/POST/PATCH/DELETE` typowanymi ścieżkami z OpenAPI. `credentials: "include"` (cookies auth).

```ts
import { createApiClient } from "@repo/api-client";

const api = createApiClient({ baseUrl: "http://localhost:3000" });
const { data, error } = await api.GET("/api/v1/projects/", {
  params: { query: { status: "active", page: 1 } },
});
```

## Błędy

`ApiError` (rzucany przez `unwrap` w `@repo/api-react`) rozkłada problem+json na `status`, `title`,
`detail` (= `message`), `instance` oraz **`errors`** — listę `[{ path, message }]` przypisującą błąd do
pola żądania (walidacja 400, konflikt unikalności 409, 422). `@repo/forms` zamienia ją na błędy przy
kontrolkach (`serverErrorToFieldErrors`), więc nie owijaj mutacji w `catch` z własnym komunikatem.

## Regeneracja po zmianie API

```bash
pnpm --filter @repo/api openapi:dump      # zrzuca openapi.json ze schematów Zod (offline)
pnpm --filter @repo/api-client generate   # openapi.json → src/generated/schema.d.ts
```

Pełny przepis: `docs/recipes/jak-regenerowac-klienta.md`.
