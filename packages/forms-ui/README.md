# packages/forms-ui

Renderery pól spięte z design systemem — most między silnikiem (`@repo/forms`), metadanymi encji
(`@repo/schemas`) a komponentami DS (`@repo/design-system`). Bez routera i `import.meta.env`.

## Mapowanie „typ pola (control) → komponent DS"

Jawne i jedyne — definiowane w `src/field-renderer.tsx` (`Control`). Nowy typ pola = nowy `case` tutaj

- wpis w tej tabeli i w `docs/ds-component-inventory.md`.

| `FieldControl` | Komponent DS    | Adapter wartości                                  |
| -------------- | --------------- | ------------------------------------------------- |
| `text`         | `Input`         | `value: string` / `onChange(e.target.value)`      |
| `number`       | `Input[number]` | `Number(value)`; `""` → `undefined`               |
| `textarea`     | `Textarea`      | `string`                                          |
| `select`       | `Select`        | `string` + `options`                              |
| `checkbox`     | `Checkbox`      | `checked: boolean` / `onChange(e.target.checked)` |
| `switch`       | `Switch`        | `checked: boolean` / `onCheckedChange`            |
| `radio`        | `RadioGroup`    | `string` + `options`                              |
| `date`         | `DateInput`     | `string` (`yyyy-mm-dd`; Zod `coerce.date`)        |
| `relation`     | `Combobox`      | `string`; opcje z `relationSource` (async z API)  |

## API

- **`deriveFields(entity)`** — z encji (`entity.fields` + `entity.schema`) → `FieldDef[]`
  (kolejność schematu; `required` z Zod `!isOptional()`). **`emptyValues(entity)`** — puste wartości startowe.
- **`FormFields({ fields, form, relationSource })`** — renderuje pola spięte ze stanem `@repo/forms`
  (`useForm`): `value`/`error`/`onChange` per pole.
- **`FieldRenderer` / `Field`** — pojedyncze pole (wrapper: etykieta + `*` gdy wymagane + błąd `role=alert`).
- **`RelationSource`** — skorupa wstrzykuje źródło opcji pól relacji (dociąga z API: `options`/`onSearch`/`loading`).

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

Przepis: `docs/recipes/jak-zdefiniowac-formularz.md` (Faza 7, etap C).
