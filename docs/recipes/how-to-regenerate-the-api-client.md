[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to regenerate the API client

# Recipe: how to regenerate the API client after an API change

The client (`packages/api-client`) and the hook types (`packages/api-react`) come from a **single
source of truth**: the Zod route schemas → OpenAPI → TypeScript types. Regenerate the client after
every change to the API contract.

## The flow (two steps, one command)

```bash
pnpm generate:client
# = pnpm --filter @repo/api openapi:dump   → apps/api/openapi.json (from the Zod schemas, offline)
#   pnpm --filter @repo/api-client generate → packages/api-client/src/generated/schema.ts
```

1. **`openapi:dump`** builds the Fastify application in memory and writes `apps/api/openapi.json`.
   It works **without a database** (the pool is lazy; `buildApp` never queries it). The
   specification is an artefact — **never edit it by hand**.
2. **`generate`** (`openapi-typescript`) turns `openapi.json` into types in
   `src/generated/schema.ts`. `openapi-fetch` consumes those types, and the hooks in `api-react`
   derive their request and response shapes from them automatically.

Commit **both** generated files (`openapi.json` and `schema.ts`) — that is what lets the build and
the type-checker work without a running API.

> **New types only appear after the package is built.** `generate:client` refreshes `src`, but
> `api-react` and the shells import `@repo/api-client` through `main: ./dist/index.js`. Without a
> build you get `Property '/api/v1/…' does not exist on type 'paths'` despite a perfectly correct
> `schema.ts`. Run `pnpm --filter @repo/api-client build`, or work under `pnpm dev`, where the
> packages' `tsc -w` does it for you.

## When to regenerate

After every change to routes or DTOs: a new endpoint, changed body or response fields, changed list
filters, changed paths. New entities are added following
[How to add an entity](./how-to-add-an-entity.md); regenerating the client is what brings them to the
frontend.

## The CI guard (the BE ↔ FE contract)

CI runs `pnpm generate:client` followed by `git diff --exit-code` on `openapi.json` and
`src/generated`. If a commit carries a stale client — someone changed the API without regenerating —
**CI goes red**. That is what keeps the frontend and the API in sync.

## Consuming it

```ts
import { createApiClient } from "@repo/api-client";
const api = createApiClient({ baseUrl }); // baseUrl is injected EXPLICITLY by the shell

// React (packages/api-react): <QueryClientProvider><ApiProvider client={api}> … </>
const { data } = useProjects({ status: "active" });
```

The package boundary: `api-client` is framework-agnostic (`fetch`), `api-react` adds TanStack Query.
No router and no `import.meta.env` inside `packages/` — the shell reads the environment.

## Related

- [`packages/api-client/README.md`](../../packages/api-client/README.md) — the client and its error shape
- [`packages/api-react/README.md`](../../packages/api-react/README.md) — hooks and query keys
- [API module structure](./api-module-structure.md) — the API side of the contract
- [ADR-0001](../adr/ADR-0001-openapi-generation.md) — why OpenAPI is generated, never written
