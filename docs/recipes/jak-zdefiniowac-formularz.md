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

## Wizard

**Domyślnie:** komponent `<Wizard>` z `@repo/forms-ui` — NARZUCA strukturę (Stepper + treść kroku +
pasek Wstecz/Dalej/Zakończ) oraz stan i walidację-gating. Wstrzykujesz tylko kroki i logikę; nie
wymyślasz mechaniki na nowo.

```tsx
<Wizard<Record<string, unknown>>
  steps={[
    {
      id: "project",
      label: "Dane projektu",
      schema: projectEntity.validation,
      render: (w) => <FormFields fields={deriveFields(projectEntity)} form={w} />,
    },
    {
      id: "tasks",
      label: "Zadania",
      schema: z.object({ taskTitlesText: z.string().optional() }),
      render: (w) => (
        <MyStep value={w.values.taskTitlesText} onChange={(v) => w.setValue("taskTitlesText", v)} />
      ),
    },
  ]}
  defaultValues={{ ...emptyValues(projectEntity), taskTitlesText: "" }}
  labels={{ next: "Dalej", submit: "Utwórz" }} // domyślnie Wstecz/Dalej/Zakończ
  onComplete={async (values) => {
    /* orkiestracja handlerów */
  }}
/>
```

- Każdy krok = `{ id, label, schema, render(wizard) }`. `WizardApi` spełnia `FormLike`, więc krok wprost
  renderuje `<FormFields form={wizard} … />`. Walidacja per krok (schemat Zod) blokuje „Dalej".
- **Helper** `entityStep(entity, { relationSource? })` — krok = formularz encji bez boilerplate'u
  (`schema`/pola z encji).
- **`onComplete` orkiestruje dowolne handlery** — kluczowe: część danych → baza, część → inne cele.
  Referencyjny „utwórz projekt" (`apps/admin/src/entities/project-wizard.tsx`): dane → `createProject`
  (baza), zaproszenia → `inviteProjectMembers` (**mailer, bez zapisu**), zadania → `createTask` hurtem.
  Dowód, że silnik formularzy jest niezależny od CRUD.

**Escape hatch:** `useWizard({ steps, defaultValues, onComplete })` z `@repo/forms` — sam silnik (stan,
kroki, `next/prev/submit`) bez narzuconego chrome, gdy potrzebujesz nietypowego layoutu.

## Świadomie POMINIĘTE

**Save & resume** wizardów (persystencja częściowego stanu) — moduł opt-in; przepis w Fazie 9.
