# Przepis: jak regenerować klienta API po zmianie API

Klient (`packages/api-client`) i typy hooków (`packages/api-react`) pochodzą z **jednego źródła
prawdy**: schematów Zod tras → OpenAPI → typy TS. Po każdej zmianie kontraktu API zregeneruj klienta.

## Przepływ (dwa kroki, jedna komenda)

```bash
pnpm generate:client
# = pnpm --filter @repo/api openapi:dump   → apps/api/openapi.json (ze schematów Zod, offline)
#   pnpm --filter @repo/api-client generate → packages/api-client/src/generated/schema.ts
```

1. **`openapi:dump`** buduje aplikację Fastify w pamięci i zapisuje `apps/api/openapi.json`.
   Działa **bez bazy** (leniwy pool; `buildApp` nie odpytuje DB). Specyfikacji **nie edytujemy
   ręcznie** — to artefakt.
2. **`generate`** (`openapi-typescript`) zamienia `openapi.json` na typy w
   `src/generated/schema.ts`. `openapi-fetch` używa tych typów; hooki w `api-react` czerpią z nich
   req/res automatycznie.

Zacommituj **oba** wygenerowane pliki (`openapi.json` + `schema.ts`) — dzięki temu build i typy
działają bez odpalonego API.

> **Nowe typy widać dopiero po zbudowaniu pakietu.** `generate:client` odświeża `src`, ale
> `api-react` i skorupy importują `@repo/api-client` przez `main: ./dist/index.js`. Bez builda
> dostaniesz `Property '/api/v1/…' does not exist on type 'paths'` mimo poprawnie wygenerowanego
> `schema.ts`. Zrób `pnpm --filter @repo/api-client build` (albo pracuj pod `pnpm dev`, gdzie
> `tsc -w` pakietów robi to sam).

## Kiedy regenerować

Po każdej zmianie tras/DTO: nowy endpoint, zmiana pól body/response, filtrów listy, ścieżek.
Nowe encje dodajesz wg `jak-dodac-encje.md` — potem regeneracja klienta wprowadza je do FE.

## Kontrola w CI (kontrakt BE↔FE)

CI uruchamia `pnpm generate:client` i `git diff --exit-code` na `openapi.json` oraz
`src/generated`. Jeśli commit ma nieaktualny klient (ktoś zmienił API bez regeneracji) —
**CI czerwone**. To wymusza spójność FE z API.

## Konsumpcja

```ts
import { createApiClient } from "@repo/api-client";
const api = createApiClient({ baseUrl }); // baseUrl wstrzykiwany JAWNIE przez skorupę

// React (packages/api-react): <QueryClientProvider><ApiProvider client={api}> … </>
const { data } = useProjects({ status: "active" });
```

Granica pakietów: `api-client` framework-agnostic (`fetch`), `api-react` dokłada TanStack Query.
Żadnego routera ani `import.meta.env` w `packages/` — env czyta skorupa.
