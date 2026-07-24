# packages/schemas

Schematy Zod encji/formularzy + metadane. Czysty TS, jedyna zależność runtime: `zod`.
**Jedno źródło prawdy** dla kształtu danych (baza, walidacja BE/FE, typy, OpenAPI, kolumny admina,
formularze).

## Model encji (`defineEntity`)

Encja = czysty schemat Zod (kształt + walidacja, w tym międzypolowa przez `refine`) **+**
companion-map metadanych (wyłącznie prezentacja: `label`, `control`, `options`, `relation`, `list`).
Parytet kluczy `fields` ↔ klucze schematu wymusza TypeScript — brak metadanej dla pola = błąd
kompilacji, brak dryfu.

- `entity.schema` — czysty schemat (bez walidacji międzypolowej).
- `entity.validation` — schemat z `refine` (albo `schema`, gdy `refine` nieustawione). Używany jako
  body tworzenia w API.
- `entity.fields` — metadane prezentacji per pole. `control` mapuje się na komponent DS (Faza 7).
- Relacje: `control: "relation"` + `relation: { entity, displayField }`.

Encje referencyjne: `project.entity.ts`, `task.entity.ts`. Etykiety po angielsku (język admina).

Pełny proces dodania encji: `docs/recipes/jak-dodac-encje.md`.
