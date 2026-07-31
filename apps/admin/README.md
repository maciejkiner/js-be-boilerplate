[Home](../../README.md) › [Documentation](../../docs/README.md) › apps/admin

# apps/admin

The admin panel — a second shell (separately deployable, on its own subdomain) built on the same
`packages/*` as `web`. Vite + React + TanStack Router (code-based routes). Dev port **5174**, which is
`ADMIN_ORIGIN` in the API.

## Architecture

- **Environment → shell**: `import.meta.env.VITE_API_URL` is read in `src/api.ts` and injected into
  `createApiClient`. Packages never reach for the environment themselves — that is the boundary.
- **Providers** (`main.tsx`): QueryClient → ApiProvider → ToastProvider → RouterProvider.
- **Entity registry** (`src/entities/registry.ts`): the single source of the menu and the routes. The
  scaffolder adds an entry at the `scaffolder:admin-entities` anchor; `Nav` and the route tree
  (`routes.ts`) are built from that array.
- **Auth gate**: `ProtectedShell` (a pathless layout) checks the session with `useMe` and redirects to
  `/login` when there is none.
- **Entity views** (`src/entities/*.tsx`): a list (`DataTable` with filters in the `toolbar` slot,
  sorting and pagination), a detail page, deletion (`Modal` + `toast`), and **create/edit**
  (`EntityForm` built on `@repo/forms` + `@repo/forms-ui`, derived from the entity). Relation fields
  go through `useRelationSource` (`src/relation-source.ts`).
- **The "create a project" wizard** (`src/entities/project-wizard.tsx`): three steps, and an
  `onComplete` that orchestrates data → database, invitations → mailer, tasks → bulk create. Proof
  that the form engine is independent of CRUD.

Errors coming back from the API are never swallowed: a form shows them on the field the API named
(plus a global alert), and actions without a form pass the message into the toast. See
[How to define a form](../../docs/recipes/how-to-define-a-form.md).

The router lives ONLY here; `packages/ui` receives links through slots (`nav`/`actions`).

## Running it

```bash
pnpm --filter @repo/admin dev   # admin on 5174 (the API on 3000 must be running)
```

## Related

- [Frontend shell structure](../../docs/recipes/frontend-shell-structure.md) — the recipe behind this layout
- [How to define a form](../../docs/recipes/how-to-define-a-form.md) — forms, wizards and API errors
- [`apps/web`](../web/README.md) — the other shell on the same packages
- [`packages/ui`](../../packages/ui/README.md) — `DataTable`, `AdminLayout`, `EmptyState`
- [`packages/api-react`](../../packages/api-react/README.md) — the hooks these views consume
