# Przepis: jak zdefiniować formularz / dodać typ pola

Formularze stoją na trzech warstwach (jedno źródło prawdy = encja Zod + metadane):

- **`@repo/forms`** — headless silnik (`useForm`, `useWizard`), walidacja przez Zod, bez komponentów.
- **`@repo/forms-ui`** — renderery: `deriveFields(entity)`, `FormFields`, jawne mapowanie typ→komponent DS.
- **skorupa** (`apps/admin`) — spina formularz z `@repo/api-react` (mutacje) i routerem.

## Formularz create/edit encji

```tsx
const create = useCreateProject();
<EntityForm
  entity={projectEntity}
  defaultValues={emptyValues(projectEntity)} // create; edit: recordToFormValues(entity, record)
  submitLabel="Utwórz"
  onSubmit={(values) => create.mutateAsync(values as CreateProjectBody)}
/>;
```

`EntityForm` (`apps/admin/src/entities/entity-form.tsx`) w środku: `useForm({ schema: entity.validation,
defaultValues, onSubmit })` + `deriveFields(entity)` + `FormFields`. Walidacja (per-pole **i
międzypolowa** — np. `endDate ≥ startDate`) pochodzi z `entity.validation`; błędy renderują się przy
polach. Wzorzec pokrywa Project i Task — nic nie piszemy per encja poza podpięciem mutacji.

## Pola relacji (async)

Skorupa wstrzykuje **generyczny** `RelationSource` (`apps/admin/src/relation-source.ts`): jeden async
fetcher `(relation, query) => Promise<wiersze>` uderzający w `GET /api/v1/<plural>`. Działa dla
**dowolnej** encji-celu bez rejestracji — nowa encja od razu jest dostępna jako cel relacji (żadnych
per-encja gałęzi). Label liczy `forms-ui` (`RelationControl`, `useQuery` per pole) z
`relation.displayField`, więc **ta sama encja-cel może być pokazywana różnymi polami** (np.
`comment`→`task` po `title`, a `subtask`→`task` po `priority`).

Filtrowanie: wpisywana fraza idzie do endpointu (`?q=` tam, gdzie moduł to wspiera, np. `users`) i
dodatkowo filtruje lokalnie po etykiecie. Limit: pobierane top 50 — dla dużych tabel dodaj obsługę
`?q=` w danym module API. Endpoint listy musi być dostępny dla roli używającej panelu (np.
`GET /api/v1/users` jest `admin`-only).

## Dodanie nowego typu pola

1. **Schemat**: dodaj wartość do `FieldControl` w `packages/schemas/src/lib/define-entity.ts`.
2. **Renderer**: dodaj `case` w `Control` (`packages/forms-ui/src/field-renderer.tsx`) mapujący typ na
   komponent DS + adapter wartości.
3. **DS**: dorób komponent w `design-system` (mock) — docelowo w silk (patrz `docs/ds-gap-analysis.md`).
4. **Dokumentacja**: uzupełnij tabelę mapowania w `packages/forms-ui/README.md` i inwentarz
   `docs/ds-component-inventory.md`.

Tabela mapowania `FieldControl → komponent DS`: `packages/forms-ui/README.md`.

## Wizard (wiele handlerów submitu)

`useWizard({ steps, defaultValues, onComplete })` — kroki z własnymi schematami Zod, `next/prev/submit`.
Kluczowe: **`onComplete` orkiestruje dowolne handlery**. Referencyjny „utwórz projekt"
(`apps/admin/src/entities/project-wizard.tsx`): dane → `createProject` (baza), zaproszenia →
`inviteProjectMembers` (**mailer, bez zapisu**), zadania → `createTask` hurtem. To dowód, że silnik
formularzy jest niezależny od CRUD (część danych do bazy, część do innych handlerów).

## Świadomie POMINIĘTE

**Save & resume** wizardów (persystencja częściowego stanu) — moduł opt-in; przepis w Fazie 9.
