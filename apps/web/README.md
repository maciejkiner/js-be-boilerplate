[Home](../../README.md) › [Documentation](../../docs/README.md) › apps/web

# apps/web

The default public shell: Vite + React + TanStack Router. Thin by design — the real public views are
added in your project. Dev port **5173**, which is `WEB_ORIGIN` in the API.

It exists mainly as **a second shell on the same packages** as `admin` — a permanent test of the
interchangeability boundary (the same design system, `packages/ui`, `api-client` and `api-react`;
the router and `import.meta.env` live only here). Providers and environment injection work exactly as
in `admin` (`src/api.ts` + `src/main.tsx`).

## Running it

```bash
pnpm --filter @repo/web dev   # web on 5173 (the API on 3000 must be running)
```

## Related

- [Frontend shell structure](../../docs/recipes/frontend-shell-structure.md) — the recipe behind this layout
- [`apps/admin`](../admin/README.md) — the other shell, with the full set of views
- [`packages/api-react`](../../packages/api-react/README.md) — data fetching hooks
- [`packages/ui`](../../packages/ui/README.md) — the shared compositions
