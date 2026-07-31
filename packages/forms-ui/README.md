[Home](../../README.md) › [Documentation](../../docs/README.md) › packages/forms-ui

# packages/forms-ui

Field renderers wired to the design system — the bridge between the engine (`@repo/forms`), the
entity metadata (`@repo/schemas`) and the design-system components (`@repo/design-system`). No router,
no `import.meta.env`.

## The "field control → design-system component" mapping

Explicit, and the only one — defined in `src/field-renderer.tsx` (`Control`). A new field type means a
new `case` there, plus a row in this table and an entry in
[`docs/ds-component-inventory.md`](../../docs/ds-component-inventory.md).

| `FieldControl` | Design-system component      | Value adapter                                                 |
| -------------- | ---------------------------- | ------------------------------------------------------------- |
| `text`         | `Input`                      | `value: string` / `onChange(e.target.value)`                  |
| `number`       | `Input[number]`              | `Number(value)`; `""` → `undefined`                           |
| `textarea`     | `Textarea`                   | `string`                                                      |
| `select`       | `Select`                     | `string` + `options`                                          |
| `checkbox`     | `Checkbox`                   | `checked: boolean` / `onChange(e.target.checked)`             |
| `switch`       | `Switch`                     | `checked: boolean` / `onCheckedChange`                        |
| `radio`        | `RadioGroup`                 | `string` + `options`                                          |
| `date`         | `DateInput`                  | `string` (`yyyy-mm-dd`; Zod `coerce.date`)                    |
| `datetime`     | `Input[type=datetime-local]` | `string` (`yyyy-mm-ddThh:mm`, local time; Zod `coerce.date`)  |
| `relation`     | `Combobox`                   | `string`; options from `relationSource` (async, from the API) |

## API

- **`deriveFields(entity)`** — from the entity (`entity.fields` + `entity.schema`) to `FieldDef[]`
  (schema order; `required` from Zod's `!isOptional()`). **`emptyValues(entity)`** — the empty
  starting values.
- **`FormFields({ fields, form, relationSource })`** — renders the fields bound to `@repo/forms` state
  (`useForm` or `useWizard`, which share the `FormLike` interface): `value`, `error` and `onChange`
  per field. A field with `visibleWhen(values)` renders only when the condition holds (conditional
  visibility and dependencies).
- **`FieldRenderer` / `Field`** — a single field (the wrapper: label, `*` when required, the hint from
  `FieldMeta.help`, and the error with `role=alert`).
- **`Wizard` / `entityStep`** — the wizard chrome (stepper, navigation, the submit error) with steps
  injected as `render` slots.
- **`RelationSource`** — the shell injects the option source for relation fields (fetched from the
  API: `options`/`onSearch`/`loading`).

```tsx
const fields = deriveFields(projectEntity);
const form = useForm({
  schema: projectEntity.validation,
  defaultValues: emptyValues(projectEntity),
  onSubmit,
});
<form onSubmit={form.handleSubmit}>
  <FormFields fields={fields} form={form} />
  <Button type="submit" disabled={form.isSubmitting}>
    Zapisz
  </Button>
</form>;
```

## Related

- [How to define a form](../../docs/recipes/how-to-define-a-form.md) — the recipe, including how to add a field type
- [`packages/forms`](../forms/README.md) — the engine behind these renderers
- [`packages/schemas`](../schemas/README.md) — the controls a field can declare
- [`docs/ds-component-inventory.md`](../../docs/ds-component-inventory.md) — the design-system vocabulary
