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

Skorupa wstrzykuje `RelationSource` (dociąga opcje z API). Patrz `apps/admin/src/relation-source.ts`:
`project` → `useProjects` (filtr lokalny), `user` → `useUsers` z async-search (`?q=`). Endpoint
`GET /api/v1/users` (RBAC admin) jest źródłem dla `assignee`.

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
