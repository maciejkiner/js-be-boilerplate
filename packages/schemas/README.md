# packages/schemas

Schematy Zod encji/formularzy + metadane. Czysty TS, jedyna zależność runtime: `zod`.
**Jedno źródło prawdy** dla kształtu danych (baza, walidacja BE/FE, typy, OpenAPI, kolumny admina,
formularze).

## Model encji (`defineEntity`)

Encja = schemat Zod (kształt + walidacja, w tym międzypolowa przez `refine`) **+** metadane
prezentacji per pole (`label`, `control`, `options`, `relation`, `list`).

- `name` / `plural` — pojedyncza / mnoga. `name` musi być identyfikatorem camelCase; z `plural`
  scaffolder wyprowadza nazwę tabeli, ścieżkę API i nazwy plików (formy: `tools/scaffold/README.md`).
- `label` / `labelPlural` — etykiety UI (detal / menu i lista admina).
- `entity.schema` — czysty schemat (bez walidacji międzypolowej).
- `entity.validation` — schemat z `refine` (albo `schema`, gdy `refine` nieustawione). Używany jako
  body tworzenia w API.
- `entity.fields` — metadane prezentacji per pole. `control` mapuje się na komponent DS.

Pola deklaruj **builderami `f.*`** przez `defineEntity` (droga domyślna). Dla kształtów, których
buildery nie wyrażają, jest osobna funkcja `defineEntityRaw` — własny `schema` + companion-map
`fields`.

## Buildery pól (`f.*`) — droga domyślna

```ts
import { defineEntity, f } from "@repo/schemas";

export const ticketEntity = defineEntity({
  name: "ticket",
  plural: "tickets",
  label: "Ticket",
  labelPlural: "Tickets",
  displayField: "title",
  // opcjonalna walidacja MIĘDZYPOLOWA (schemat wywiedziony z pól):
  refine: (schema) =>
    schema.refine((value) => !value.dueDate || value.dueDate > new Date(), {
      message: "Termin musi być w przyszłości.",
      path: ["dueDate"],
    }),
  fields: {
    title: f.text().min(1).sortable().filterable(),
    status: f.select({ open: "Open", done: "Done" }).filterable(),
    dueDate: f.date().help("Opcjonalny termin").optional().sortable(),
    projectId: f.relation("project", "name").filterable(),
  },
});
```

Jedna deklaracja produkuje **obie** strony: schemat Zod i metadane. Dzięki temu:

- `control` nie może rozjechać się z typem Zod — nie ma dwóch niezależnych deklaracji tego samego faktu,
- lista wartości `select`/`radio` jest wpisana **raz** (mapa `wartość → etykieta` zamiast `z.enum`
  osobno i `options` osobno),
- `f.` w edytorze wypisuje wszystkie kontrolki, a każda z nich tylko swoje sensowne metody —
  nie trzeba pamiętać nazw kluczy metadanych.

### Fabryki

| Fabryka                          | Typ Zod              | Metody własne                          |
| -------------------------------- | -------------------- | -------------------------------------- |
| `f.text()`                       | `z.string()`         | `.min` `.max` `.email` `.url` `.regex` |
| `f.textarea()`                   | `z.string()`         | jak `text`                             |
| `f.number()`                     | `z.number()`         | `.int` `.min` `.max` `.nonnegative`    |
| `f.date()`                       | `z.coerce.date()`    | — (sama data)                          |
| `f.datetime()`                   | `z.coerce.date()`    | — (data z godziną)                     |
| `f.checkbox()` / `f.switch()`    | `z.boolean()`        | —                                      |
| `f.select(map)` / `f.radio(map)` | `z.enum(klucze map)` | — (mapa niesie wartości i etykiety)    |
| `f.relation(encja, pole)`        | `z.string().uuid()`  | —                                      |

### Metody wspólne

| Metoda                          | Efekt                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.label(text)`                  | etykieta pola; **pominięta** — wywodzi się z nazwy pola (`dueDate` → „Due date", `venueId` → „Venue") |
| `.help(text)`                   | podpowiedź pod polem w `forms-ui`                                                                     |
| `.optional()`                   | pole opcjonalne (`nullish`); kolejność w chainie dowolna                                              |
| `.sortable()` / `.filterable()` | kolumna sortowalna / filtrowalna w adminie (wchodzi do allowlisty w module API)                       |
| `.hidden()`                     | ukrywa kolumnę na liście (pole nadal w formularzu i na detalu)                                        |
| `.unique()`                     | wartość unikalna w tabeli (patrz niżej)                                                               |
| `.zod(fn)`                      | escape hatch: dowolna transformacja schematu pola (`regex`, `refine`, `transform`)                    |

Buildery są **niemutowalne** — każda metoda zwraca nowy builder, więc bazową definicję pola można
bezpiecznie współdzielić i rozszerzać.

`.zod()` zwraca builder bez metod specyficznych dla typu, więc wołaj go po sugarze:

```ts
slug: f.text().max(80).zod((schema) => schema.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)),
```

### Unikalność

Jednopolową deklarujesz na polu, **złożoną** na encji — obie trafiają do `entity.unique`:

```ts
export const registrationEntity = defineEntity({
  // …
  // e-mail unikalny w obrębie wydarzenia (nie globalnie):
  unique: [["eventId", "email"]],
  fields: {
    eventId: f.relation("event", "name"),
    email: f.text().email(),
    code: f.text().unique(), // unikalny globalnie
  },
});
```

Scaffolder przekłada każdą grupę na **częściowy** indeks unikalny (`where deleted_at is null`), więc
soft delete zwalnia wartość — usunięty miękko rekord nie blokuje jej na zawsze. Naruszenie wraca
z API jako **409** z nazwami pól, które się powtórzyły (nie jako 500).

## `defineEntityRaw` — escape hatch

Gdy pole wymaga kształtu, którego buildery nie wyrażają, podaj własny `schema` i metadane wprost.
To **osobna funkcja**, nie wariant `defineEntity` — dzięki temu obie mają po jednej sygnaturze,
a błąd w definicji encji wskazuje konkretne pole zamiast całego wywołania.

Wtedy **parytet kluczy `fields` ↔ schemat** wymusza TypeScript (brak metadanej = błąd kompilacji),
ale parowanie `control` ↔ typ Zod pilnujesz **sam**:

| `control`             | typ Zod             | wymaga dodatkowo | wariant typu        |
| --------------------- | ------------------- | ---------------- | ------------------- |
| `text` / `textarea`   | `z.string()`        | —                | `SimpleFieldMeta`   |
| `number`              | `z.number()`        | —                | `SimpleFieldMeta`   |
| `date` / `datetime`   | `z.coerce.date()`   | —                | `SimpleFieldMeta`   |
| `checkbox` / `switch` | `z.boolean()`       | —                | `SimpleFieldMeta`   |
| `select` / `radio`    | `z.enum([...])`     | `options`        | `ChoiceFieldMeta`   |
| `relation`            | `z.string().uuid()` | `relation`       | `RelationFieldMeta` |

`FieldMeta` to unia dyskryminowana po `control` — `tsc` wymusza komplet dodatków (`select` bez
`options` = błąd, `text` z `options` = błąd), ale **nie** sprawdza typu Zod. To właśnie ten inwariant
buildery zdejmują z człowieka.

```ts
import { z } from "zod";
import { defineEntityRaw } from "@repo/schemas";

const shape = z.object({ title: z.string().min(1) });

export const ticketEntity = defineEntityRaw({
  name: "ticket",
  plural: "tickets",
  label: "Ticket",
  labelPlural: "Tickets",
  displayField: "title",
  schema: shape,
  fields: {
    title: { label: "Title", control: "text", list: { sortable: true, filterable: true } },
  },
});
```

Encje referencyjne: `project.entity.ts`, `task.entity.ts`, `comment.entity.ts` — wszystkie na
builderach. Etykiety po angielsku (język admina). Mapowanie `control` → komponent DS:
`packages/forms-ui/README.md`.

Pełny proces dodania encji: `docs/recipes/jak-dodac-encje.md`.
