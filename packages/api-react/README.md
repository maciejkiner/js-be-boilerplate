[Home](../../README.md) › [Documentation](../../docs/README.md) › packages/api-react

# packages/api-react

**TanStack Query** bindings over `@repo/api-client` (hooks per resource). React and TanStack Query are
allowed inside `packages/`; **a router and `import.meta.env` are not** — the client is injected
explicitly by the shell.

## Usage

The shell creates the client (with an explicit `baseUrl`) and mounts the providers — TanStack Query
**outside**, `ApiProvider` **inside**:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@repo/api-client";
import { ApiProvider } from "@repo/api-react";

const queryClient = new QueryClient();
const api = createApiClient({ baseUrl: import.meta.env.VITE_API_URL }); // the SHELL reads the env

<QueryClientProvider client={queryClient}>
  <ApiProvider client={api}>{/* app */}</ApiProvider>
</QueryClientProvider>;
```

Hooks (the pattern for the reference entities `project` and `task`):

```ts
const { data, isLoading } = useProjects({ status: "active", page: 1 });
const create = useCreateProject(); // create.mutate({ ... }) → invalidates the lists
```

- Query hooks: `useProjects`/`useProject`, `useTasks`/`useTask`.
- Mutations: `useCreate*`/`useUpdate*`/`useDelete*` (they invalidate `*Keys.all` on success).
- `*Keys` — hierarchical cache keys. `*ListQuery`/`*DetailQuery` — query-option factories, so the
  fetching logic is testable without React.
- A failed request throws `ApiError` (`unwrap`), carrying the message and the field list from
  problem+json — hand that error to the form or the toast instead of inventing a message.

Request and response types (`Project`, `CreateProjectBody`, …) come from OpenAPI — see
[`@repo/api-client`](../api-client/README.md).

## Related

- [`packages/api-client`](../api-client/README.md) — the client and the error shape underneath
- [How to regenerate the API client](../../docs/recipes/how-to-regenerate-the-api-client.md) — after an API change
- [Frontend shell structure](../../docs/recipes/frontend-shell-structure.md) — where the providers are mounted
- [`apps/admin`](../../apps/admin/README.md) — the reference consumer
