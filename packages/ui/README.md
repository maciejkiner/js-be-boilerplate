# packages/ui

Kompozycje **na** design systemie (`@repo/design-system`): `DataTable`, `AdminLayout`,
`EmptyState`. Bez routera i `import.meta.env` — komponenty sterowane propsami; router/dane żyją w
skorupie.

## Komponenty

- **`DataTable<T>`** — sortowanie (nagłówki → `onSortChange`), paginacja (stopka → `onPageChange`),
  stany loading/error/empty. Filtry przez slot `toolbar` (skorupa komponuje z DS `Select`/`Input`
  i steruje query). Sterowana propsami: stan i pobieranie danych są po stronie skorupy.
- **`AdminLayout`** — sidebar + header + main. Router-agnostyczny: `nav`/`actions` to sloty, do
  których skorupa wstrzykuje `<Link>`i (granica „router tylko w apps/*").
- **`EmptyState`** — pusty stan kolekcji.

Konsumowane przez `apps/admin` (widoki encji referencyjnych) i `apps/web`.
