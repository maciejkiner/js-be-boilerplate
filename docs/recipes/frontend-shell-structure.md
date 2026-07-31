[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › Frontend shell structure

# Recipe: the structure of a frontend shell, and how to add a view

The shells (`apps/web`, `apps/admin`) are **thin** Vite + React + TanStack Router applications built
on shared packages (`@repo/design-system`, `@repo/ui`, `@repo/api-client`, `@repo/api-react`). All
domain logic and components live in the packages — the shell only mounts the router, the providers
and the environment.

> The boundary (specification, section 4): **the router and `import.meta.env` exist ONLY in
> `apps/*`**. Packages receive the environment and the client explicitly injected. `apps/admin`,
> being a second shell on the same packages, is a permanent test of that boundary.

## Anatomy of a shell

```
src/
  api.ts        — import.meta.env.VITE_API_URL → createApiClient + QueryClient
  main.tsx      — createRoot + providers: QueryClient → ApiProvider → ToastProvider → Router
  routes.ts     — the route tree (code-based)
  app.css       — @import "tailwindcss" + @source pointing at the workspace packages
  <views>.tsx
vite.config.ts  — react() + tailwindcss(); server.port (5173 web / 5174 admin)
tsconfig.json   — moduleResolution "Bundler", jsx react-jsx, types ["vite/client"]
```

- **The environment is injected EXPLICITLY**:
  `createApiClient({ baseUrl: import.meta.env.VITE_API_URL })`, in the shell only. Never import
  `import.meta.env` inside `packages/`.
- **Tailwind v4**: `app.css` carries `@import "tailwindcss";` plus
  `@source "../../../design-system/src";` and `@source "../../../packages/ui/src";`. Without those,
  classes coming from the packages (which live in `node_modules`) never reach the bundle.

## Adding a simple view

1. A component in `src/<name>.tsx`; data through the hooks from `@repo/api-react`
   (`useProjects`/`useProject`/…). Handle the UI states (loading/error/empty) explicitly —
   `DataTable` and `EmptyState` from `@repo/ui` already do.
2. Add the route in `src/routes.ts` (`createRoute({ getParentRoute, path, component })`).

## Adding an entity to the admin panel (registry → menu + routes)

The admin panel builds its menu and routes from `src/entities/registry.ts`. You add **one entry** at
the anchor:

```ts
{ name: "invoice", label: "Faktury", path: "/invoices", List: InvoicesList, Detail: InvoiceDetail },
// scaffolder:admin-entities — do not remove
```

`Nav` (the menu) and `routes.ts` (the list at `${path}` and the detail at `${path}/$id`) are built
from that array — nothing else to touch. The entity views (`src/entities/*.tsx`) consist of a list
(`DataTable`, with filters in the `toolbar` slot built from the design-system `Select`/`Input`,
sorting by header and pagination), a detail page and deletion (`Modal` + `useToast`).

## The boundary in practice

- `packages/ui` is router-agnostic: `AdminLayout` takes `nav`/`actions` as **slots** into which the
  shell injects its `<Link>`s. Do not import a router inside a package — lint (`eslint-package`)
  blocks it, and `apps/admin` running on the same packages would expose the leak immediately.
- Routing stays loosely typed (no `Register`), because routes come from a runtime registry. Contract
  safety is provided by the `api-client` layer instead (types generated from OpenAPI).

## Running it

```bash
pnpm --filter @repo/api dev     # API (3000) — required, the views call /api/v1
pnpm --filter @repo/admin dev   # admin (5174)
pnpm --filter @repo/web dev     # web (5173)
```

Working on a package at the same time? Use `pnpm dev` at the root instead: the shells consume the
packages' `dist`, so without the `tsc -w` watchers your change never reaches the browser.

## Related

- [`apps/admin/README.md`](../../apps/admin/README.md) — the admin shell in detail
- [`apps/web/README.md`](../../apps/web/README.md) — the public shell
- [`packages/ui/README.md`](../../packages/ui/README.md) — `DataTable`, `AdminLayout`, `EmptyState`
- [How to define a form](./how-to-define-a-form.md) — create/edit views and wizards
- [How to regenerate the API client](./how-to-regenerate-the-api-client.md) — how data reaches these views
