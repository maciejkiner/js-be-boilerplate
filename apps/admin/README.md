# apps/admin

Panel administracyjny — druga skorupa (osobno deployowalna, subdomena) na tych samych
`packages/*` co `web`. Vite + React + TanStack Router (code-based). Port dev **5174**
(= `ADMIN_ORIGIN` w API).

## Architektura

- **Env → skorupa**: `import.meta.env.VITE_API_URL` czytane w `src/api.ts`, wstrzykiwane do
  `createApiClient`. Pakiety nigdy nie sięgają po env (granica).
- **Providery** (`main.tsx`): QueryClient → ApiProvider → ToastProvider → RouterProvider.
- **Rejestr encji** (`src/entities/registry.ts`): jedno źródło menu i tras. Scaffolder dopisuje
  pozycję przy kotwicy `scaffolder:admin-entities`; `Nav` i drzewo tras (`routes.ts`) budują się
  z tej tablicy.
- **Auth-gate**: `ProtectedShell` (pathless layout) sprawdza sesję (`useMe`), brak → `/login`.
- **Widoki encji** (`src/entities/*.tsx`): lista (`DataTable` z filtrami w `toolbar`, sort,
  paginacja), detal, usuwanie (`Modal` + `toast`), **create/edit** (`EntityForm` na `@repo/forms` +
  `@repo/forms-ui`, wywiedziony z encji). Pola relacji przez `useRelationSource` (`src/relation-source.ts`).
- **Wizard** „utwórz projekt" (`src/entities/project-wizard.tsx`): `useWizard`, 3 kroki; `onComplete`
  orkiestruje dane→baza, zaproszenia→mailer, zadania→hurt (dowód separacji silnika od CRUD).

Router żyje TYLKO tutaj; `packages/ui` dostaje linki przez sloty (`nav`/`actions`).
Uruchomienie: `pnpm --filter @repo/admin dev`. Przepisy: `docs/recipes/frontend-shell-structure.md`,
`docs/recipes/how-to-define-a-form.md`.
