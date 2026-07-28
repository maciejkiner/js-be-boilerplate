# packages/schemas

Schematy Zod encji/formularzy + metadane. Czysty TS, jedyna zależność runtime: `zod`.
**Jedno źródło prawdy** dla kształtu danych (baza, walidacja BE/FE, typy, OpenAPI, kolumny admina,
formularze).

## Model encji (`defineEntity`)

Encja = czysty schemat Zod (kształt + walidacja, w tym międzypolowa przez `refine`) **+**
companion-map metadanych (wyłącznie prezentacja: `label`, `control`, `options`, `relation`, `list`).
Parytet kluczy `fields` ↔ klucze schematu wymusza TypeScript — brak metadanej dla pola = błąd
kompilacji, brak dryfu.

- `name` / `plural` — pojedyncza / mnoga; `plural` napędza ścieżkę API (`/api/v1/<plural>`) i nazwę tabeli.
- `label` / `labelPlural` — etykiety UI (detal / menu i lista admina).
- `entity.schema` — czysty schemat (bez walidacji międzypolowej).
- `entity.validation` — schemat z `refine` (albo `schema`, gdy `refine` nieustawione). Używany jako
  body tworzenia w API.
- `entity.fields` — metadane prezentacji per pole. `control` mapuje się na komponent DS (Faza 7).

### Typy pól (`FieldMeta`)

`FieldMeta` to **unia dyskryminowana po `control`** — dostępne pola zależą od typu kontrolki, a `tsc`
wymusza komplet (`select` bez `options` = błąd kompilacji, `text` z `options` = błąd). Każdy `control`
paruje się też z konkretnym typem Zod w schemacie — muszą być spójne:

| `control`             | typ Zod             | wymaga dodatkowo | wariant typu        |
| --------------------- | ------------------- | ---------------- | ------------------- |
| `text` / `textarea`   | `z.string()`        | —                | `SimpleFieldMeta`   |
| `number`              | `z.number()`        | —                | `SimpleFieldMeta`   |
| `date`                | `z.coerce.date()`   | —                | `SimpleFieldMeta`   |
| `checkbox` / `switch` | `z.boolean()`       | —                | `SimpleFieldMeta`   |
| `select` / `radio`    | `z.enum([...])`     | `options`        | `ChoiceFieldMeta`   |
| `relation`            | `z.string().uuid()` | `relation`       | `RelationFieldMeta` |

Pola **wspólne** dla każdego typu (opcjonalne): `help` — podpowiedź renderowana pod polem w `forms-ui`;
`list` — konfiguracja kolumny w adminie (`{ visible?, sortable?, filterable? }`).

### Przykład

```ts
import { z } from "zod";
import { defineEntity } from "@repo/schemas";

const shape = z.object({
  title: z.string().min(1),
  status: z.enum(["open", "done"]),
  dueDate: z.coerce.date().nullish(),
});

export const ticketEntity = defineEntity({
  name: "ticket",
  plural: "tickets",
  label: "Ticket",
  labelPlural: "Tickets",
  displayField: "title",
  schema: shape,
  fields: {
    title: { label: "Title", control: "text", list: { sortable: true, filterable: true } },
    status: {
      label: "Status",
      control: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "done", label: "Done" },
      ],
    },
    dueDate: {
      label: "Due date",
      control: "date",
      help: "Opcjonalny termin",
      list: { sortable: true },
    },
  },
});
```

Encje referencyjne: `project.entity.ts`, `task.entity.ts`. Etykiety po angielsku (język admina).
Mapowanie `control` → komponent DS: `packages/forms-ui/README.md`.

Pełny proces dodania encji: `docs/recipes/jak-dodac-encje.md`.
