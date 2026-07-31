[Home](../../README.md) › [Documentation](../../docs/README.md) › packages/api-client

# packages/api-client

A type-safe API client **generated from OpenAPI**. Framework-agnostic (`fetch`), with no router and
no `import.meta.env` — the `baseUrl` is injected explicitly by the shell.

## Model

- `src/generated/schema.d.ts` — **types generated** from `apps/api/openapi.json` (never edit by hand).
- `createApiClient({ baseUrl, fetch?, headers? })` — returns an `openapi-fetch` client whose
  `GET/POST/PATCH/DELETE` methods are typed by the OpenAPI paths. `credentials: "include"` (cookie
  auth).

```ts
import { createApiClient } from "@repo/api-client";

const api = createApiClient({ baseUrl: "http://localhost:3000" });
const { data, error } = await api.GET("/api/v1/projects/", {
  params: { query: { status: "active", page: 1 } },
});
```

## Errors

`ApiError` (thrown by `unwrap` in `@repo/api-react`) decomposes problem+json into `status`, `title`,
`detail` (which is also its `message`), `instance` and **`errors`** — the `[{ path, message }]` list
that ties an error to a request field (validation 400, uniqueness conflict 409, 422). `@repo/forms`
turns that list into errors next to the controls (`serverErrorToFieldErrors`), so do not wrap
mutations in a `catch` with a message of your own.

`errorMessage(error, fallback)` is the counterpart for actions **without** a form (delete,
deactivate), where a toast is the only place an error can go.

## Regenerating after an API change

```bash
pnpm --filter @repo/api openapi:dump      # dumps openapi.json from the Zod schemas (offline)
pnpm --filter @repo/api-client generate   # openapi.json → src/generated/schema.d.ts
```

Full recipe: [How to regenerate the API client](../../docs/recipes/how-to-regenerate-the-api-client.md).

## Related

- [`packages/api-react`](../api-react/README.md) — the TanStack Query bindings over this client
- [`packages/forms`](../forms/README.md) — what consumes `ApiError.errors`
- [`apps/api`](../../apps/api/README.md) — the source of the OpenAPI specification
- [ADR-0001](../../docs/adr/ADR-0001-openapi-generation.md) — why the spec is generated
