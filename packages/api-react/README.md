# packages/api-react

Bindingi **TanStack Query** nad `@repo/api-client` (hooki per zasób). React i TanStack Query
dozwolone w `packages/`; **bez routera i `import.meta.env`** — klient wstrzykiwany jawnie przez
skorupę.

## Użycie

Skorupa tworzy klienta (jawny `baseUrl`) i osadza providery — TanStack Query **na zewnątrz**,
`ApiProvider` **wewnątrz**:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClient } from "@repo/api-client";
import { ApiProvider } from "@repo/api-react";

const queryClient = new QueryClient();
const api = createApiClient({ baseUrl: import.meta.env.VITE_API_URL }); // env czyta SKORUPA

<QueryClientProvider client={queryClient}>
  <ApiProvider client={api}>{/* app */}</ApiProvider>
</QueryClientProvider>;
```

Hooki (wzorzec dla encji referencyjnych `project`/`task`):

```ts
const { data, isLoading } = useProjects({ status: "active", page: 1 });
const create = useCreateProject(); // create.mutate({ ... }) → invaliduje listy
```

- Query hooki: `useProjects`/`useProject`, `useTasks`/`useTask`.
- Mutacje: `useCreate*`/`useUpdate*`/`useDelete*` (po sukcesie invalidują `*Keys.all`).
- `*Keys` — hierarchiczne klucze cache. `*ListQuery`/`*DetailQuery` — query-option factories
  (logika pobierania testowalna bez React).

Typy req/res (`Project`, `CreateProjectBody`, …) pochodzą z OpenAPI — patrz `@repo/api-client`.
