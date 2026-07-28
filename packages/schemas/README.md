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
- Relacje: `control: "relation"` + `relation: { entity, displayField }`.

### Parowanie `control` ↔ typ Zod

Każde pole ma `control` (metadane) i odpowiadający mu typ w schemacie — **muszą być spójne**:

| `control`             | typ Zod             | wymaga w metadanych |
| --------------------- | ------------------- | ------------------- |
| `text` / `textarea`   | `z.string()`        | —                   |
| `number`              | `z.number()`        | —                   |
| `date`                | `z.coerce.date()`   | —                   |
| `select` / `radio`    | `z.enum([...])`     | `options`           |
| `checkbox` / `switch` | `z.boolean()`       | —                   |
| `relation`            | `z.string().uuid()` | `relation`          |

`help?` (opcjonalny) renderuje się jako podpowiedź pod polem w `forms-ui`.

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
