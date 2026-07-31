# Przepis: struktura skorupy FE / jak dodać widok

Skorupy (`apps/web`, `apps/admin`) to **cienkie** aplikacje Vite + React + TanStack Router na
współdzielonych pakietach (`@repo/design-system`, `@repo/ui`, `@repo/api-client`, `@repo/api-react`).
Cała logika domenowa i komponenty żyją w pakietach — skorupa tylko montuje router, providery i env.

> Granica (spec sekcja 4): **router i `import.meta.env` istnieją TYLKO w `apps/*`**. Pakiety
> dostają env i klienta wstrzykniętego jawnie. `apps/admin` jako druga skorupa to stały test tej granicy.

## Anatomia skorupy

```
src/
  api.ts        — import.meta.env.VITE_API_URL → createApiClient + QueryClient
  main.tsx      — createRoot + providery: QueryClient → ApiProvider → ToastProvider → Router
  routes.ts     — drzewo tras (code-based)
  app.css       — @import "tailwindcss" + @source na workspace-pakiety
  <widoki>.tsx
vite.config.ts  — react() + tailwindcss(); server.port (5173 web / 5174 admin)
tsconfig.json   — moduleResolution "Bundler", jsx react-jsx, types ["vite/client"]
```

- **Env wstrzykiwany JAWNIE**: `createApiClient({ baseUrl: import.meta.env.VITE_API_URL })` — tylko
  w skorupie. Nigdy nie importuj `import.meta.env` w `packages/`.
- **Tailwind v4**: `app.css` ma `@import "tailwindcss";` + `@source "../../../design-system/src";`
  i `@source "../../../packages/ui/src";` — bez tego klasy z pakietów (w `node_modules`) nie trafią
  do bundla.

## Dodanie widoku (prosty)

1. Komponent w `src/<nazwa>.tsx`; dane przez hooki z `@repo/api-react`
   (`useProjects`/`useProject`/…). Stany UI (loading/error/empty) obsłuż jawnie — `DataTable` i
   `EmptyState` z `@repo/ui` to robią.
2. Dodaj trasę w `src/routes.ts` (`createRoute({ getParentRoute, path, component })`).

## Dodanie encji do admina (rejestr → menu + trasy)

Admin generuje menu i trasy z `src/entities/registry.ts`. Dopisujesz **jedną pozycję** przy kotwicy:

```ts
{ name: "invoice", label: "Faktury", path: "/invoices", List: InvoicesList, Detail: InvoiceDetail },
// scaffolder:admin-entities — do not remove
```

`Nav` (menu) i `routes.ts` (lista `${path}` + detal `${path}/$id`) budują się z tablicy — nic więcej
nie ruszasz. Widoki encji (`src/entities/*.tsx`): lista przez `DataTable` (filtry w slocie
`toolbar` z DS `Select`/`Input`, sort po nagłówkach, paginacja), detal, usuwanie (`Modal` + `useToast`).

## Granica w praktyce

- `packages/ui` jest router-agnostyczny: `AdminLayout` dostaje `nav`/`actions` jako **sloty**, do
  których skorupa wstrzykuje `<Link>`i. Nie importuj routera w pakietach — lint (`eslint-package`)
  to zablokuje, a `apps/admin` na tych samych pakietach natychmiast ujawni przeciek.
- Routing trzymamy luźno typowany (bez `Register`), bo trasy pochodzą z runtime'owego rejestru;
  bezpieczeństwo kontraktu daje warstwa `api-client` (typy z OpenAPI).

## Uruchomienie

```bash
pnpm --filter @repo/api dev     # API (3000) — potrzebne, bo widoki wołają /api/v1
pnpm --filter @repo/admin dev   # admin (5174)
pnpm --filter @repo/web dev     # web (5173)
```
