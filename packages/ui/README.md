[Home](../../README.md) › [Documentation](../../docs/README.md) › packages/ui

# packages/ui

Compositions built **on top of** the design system (`@repo/design-system`): `DataTable`,
`AdminLayout`, `EmptyState`. No router and no `import.meta.env` — the components are driven by props;
routing and data live in the shell.

## Components

- **`DataTable<T>`** — sorting (headers → `onSortChange`), pagination (footer → `onPageChange`) and
  the loading, error and empty states. Filters go through the `toolbar` slot, which the shell
  composes from the design system's `Select`/`Input` while owning the query. Fully controlled: state
  and data fetching belong to the shell.
- **`AdminLayout`** — sidebar + header + main. Router-agnostic: `nav` and `actions` are slots into
  which the shell injects its `<Link>`s (the "router only in apps/\*" boundary).
- **`EmptyState`** — the empty state of a collection.

Consumed by `apps/admin` (the entity views) and `apps/web`.

## Related

- [Frontend shell structure](../../docs/recipes/frontend-shell-structure.md) — how a shell wires these up
- [How to update the design system](../../docs/recipes/how-to-update-the-design-system.md) — this layer absorbs DS changes
- [`packages/forms-ui`](../forms-ui/README.md) — the other consumer of the design system
- [`apps/admin`](../../apps/admin/README.md) — the reference usage
