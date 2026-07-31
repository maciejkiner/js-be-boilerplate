[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › How to define a form

# Recipe: how to define a form and how to add a field type

Forms stand on three layers, all fed by the same source of truth (the Zod entity plus its metadata):

- **`@repo/forms`** — the headless engine (`useForm`, `useWizard`), validation through Zod, no
  components.
- **`@repo/forms-ui`** — renderers: `deriveFields(entity)`, `FormFields`, and an explicit
  control → design-system component mapping.
- **the shell** (`apps/admin`) — wires the form to `@repo/api-react` (mutations) and the router.

## A create/edit form for an entity

```tsx
const create = useCreateProject();
<EntityForm
  entity={projectEntity}
  defaultValues={emptyValues(projectEntity)} // create; edit: recordToFormValues(entity, record)
  submitLabel="Utwórz"
  onSubmit={(values) => create.mutateAsync(values as CreateProjectBody)}
/>;
```

Inside, `EntityForm` (`apps/admin/src/entities/entity-form.tsx`) is
`useForm({ schema: entity.validation, defaultValues, onSubmit })` + `deriveFields(entity)` +
`FormFields`. Validation — per field **and cross-field**, for example `endDate ≥ startDate` — comes
from `entity.validation`, and errors render next to the fields. The pattern covers Project and Task:
nothing is written per entity beyond wiring up the mutation.

## Errors from the API (do not wrap the submit in `try/catch`)

`onSubmit` **is allowed to throw** — `useForm` catches the error and turns it into form errors:

- fields named in the `errors` extension of problem+json (`[{ path, message }]`) → an error on
  **that** control (a uniqueness 409, for instance, highlights `slug`);
- the response `detail` → a global error under the `_form` key, which `EntityForm` renders as an
  alert above the button.

That is why the generated create/edit views have **no `catch` of their own**: a local `catch` with a
stand-in message ("Nie udało się zapisać") throws away what the API just explained and loses the
information about which field to fix. The toast is left for the success path only.

On the API side a uniqueness 409 is built by `uniqueConflictError(label, fields)`
(`apps/api/src/db/unique-violation.ts`), which adds `errors` next to `detail`. Hand-thrown domain
validation errors can do the same:
`new BadRequestError(detail, { errors: [{ path, message }] })`.

The mapper is public (`serverErrorToFieldErrors` from `@repo/forms`). It recognises the shape
structurally, so it also works for a wrapped error (`cause`) and outside `EntityForm`.

**Actions without a form** (delete, deactivate, send an e-mail) have no field to point at — the toast
is the only place left, so it carries the message from the API:

```tsx
remove.mutate(row.id, {
  onSuccess: () => toast("Usunięto.", "success"),
  onError: (error) => toast(errorMessage(error, "Nie udało się usunąć."), "error"),
});
```

`errorMessage` comes from `@repo/api-client` (not from `@repo/forms` — this is not a form).

**A form outside CRUD** (its own schema, its own controls) uses `useForm` too — see "Zaproś
użytkownika" (`apps/admin/src/entities/users.tsx`): the Zod schema is written inline and `Input` and
`RolesPicker` are wired by hand, yet validation and API errors behave identically. A form with custom
controls gets `noValidate`: Zod owns validation, and the browser's native bubble (`type="email"`,
`required`) would only block the submit before our own message could appear.

## Relation fields (async)

The shell injects a **generic** `RelationSource` (`apps/admin/src/relation-source.ts`): a single
async fetcher `(relation, query) => Promise<rows>` that hits `GET /api/v1/<plural>`. It works for
**any** target entity without registration — a new entity is immediately available as a relation
target, with no per-entity branches. The label is resolved by `forms-ui` (`RelationControl`, one
`useQuery` per field) from `relation.displayField`, so **the same target entity can be displayed
through different fields** (`comment` → `task` by `title`, while `subtask` → `task` by `priority`).

Filtering: what the user types is sent to the endpoint (`?q=` where the module supports it, for
example `users`) and additionally filtered locally by label. The limit is the top 50 rows — for large
tables add `?q=` support in that API module. The list endpoint must be reachable for the role using
the panel (`GET /api/v1/users`, for instance, is `admin`-only).

## Adding a new field type

1. **Schema**: add the value to `FieldControl` in `packages/schemas/src/lib/define-entity.ts`.
2. **Renderer**: add a `case` to `Control` (`packages/forms-ui/src/field-renderer.tsx`) mapping the
   type to a design-system component plus a value adapter.
3. **Design system**: add the component in `design-system` (the mock) — eventually in silk, see
   [`docs/ds-gap-analysis.md`](../ds-gap-analysis.md).
4. **Documentation**: extend the mapping table in
   [`packages/forms-ui/README.md`](../../packages/forms-ui/README.md) and the inventory in
   [`docs/ds-component-inventory.md`](../ds-component-inventory.md).

The `FieldControl → design-system component` mapping table lives in
[`packages/forms-ui/README.md`](../../packages/forms-ui/README.md).

## Wizards

**By default:** the `<Wizard>` component from `@repo/forms-ui`. It _imposes_ the structure (stepper +
step content + a back/next/finish bar) along with state and validation gating. You inject the steps
and the logic; you do not reinvent the mechanics.

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
  labels={{ next: "Dalej", submit: "Utwórz" }} // defaults: Wstecz / Dalej / Zakończ
  onComplete={async (values) => {
    /* orchestrate the handlers */
  }}
/>
```

- A step is `{ id, label, schema, render(wizard) }`. `WizardApi` satisfies `FormLike`, so a step can
  render `<FormFields form={wizard} … />` directly. Per-step validation (the Zod schema) gates
  "next".
- **The helper** `entityStep(entity, { relationSource? })` turns an entity into a step with no
  boilerplate (schema and fields both come from the entity).
- **`onComplete` orchestrates arbitrary handlers** — that is the point: some data goes to the
  database, some elsewhere. The reference "create a project" wizard
  (`apps/admin/src/entities/project-wizard.tsx`) sends data → `createProject` (database), invitations
  → `inviteProjectMembers` (**the mailer, nothing persisted**) and tasks → `createTask` in bulk.
  Proof that the form engine is independent of CRUD.
- **An error in `onComplete`** needs no `try/catch` in the view either: `<Wizard>` shows the message
  in its own chrome (`submitError`) and marks the fields the API pointed at. Say which step it
  belongs to by throwing `WizardStepError.from(stepId, error)` — the wizard goes back to that step
  **keeping the original error**, so it can highlight the specific control:

  ```tsx
  const project = await createProject.mutateAsync(body).catch((error: unknown) => {
    throw WizardStepError.from("project", error); // NOT: new WizardStepError(id, error.message)
  });
  ```

  Copying `error.message` into the constructor by hand loses the field list; only the sentence
  survives.

**Escape hatch:** `useWizard({ steps, defaultValues, onComplete })` from `@repo/forms` — the engine
alone (state, steps, `next`/`prev`/`submit`) without the imposed chrome, for an unusual layout.

## Deliberately omitted

**Save & resume** for wizards (persisting partial state) is an opt-in module — see
[the recipe](./opt-in/save-and-resume.md).

## Related

- [`packages/forms/README.md`](../../packages/forms/README.md) — the engine API, including error mapping
- [`packages/forms-ui/README.md`](../../packages/forms-ui/README.md) — the control → component table
- [How to add an entity](./how-to-add-an-entity.md) — where the fields and validation come from
- [Frontend shell structure](./frontend-shell-structure.md) — how the shell wires forms to routes and data
- [API module structure](./api-module-structure.md) — the other half of the error contract
