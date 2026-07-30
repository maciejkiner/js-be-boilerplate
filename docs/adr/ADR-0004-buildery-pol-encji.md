# ADR-0004: Buildery pól (`f.*`) jako domyślny sposób deklaracji encji

- **Status:** Accepted
- **Date:** 2026-07-29
- **Authors:** zespół bootstrap
- **Related:** ADR-0001, `packages/schemas`, `tools/scaffold`, pilot DX (`docs/dx-pilot/konferencja.md`)

## Context

Encja jest jednym źródłem prawdy dla bazy, walidacji BE/FE, OpenAPI, kolumn admina i formularzy.
Do tej pory deklarowało się ją dwiema niezależnymi częściami: schematem Zod (`schema`) i companion-mapą
metadanych (`fields`). Parytet **kluczy** wymuszał TypeScript, ale **treść** obu części musiała być
spójna z ręki człowieka:

- `control` i typ Zod to dwie deklaracje tego samego faktu. `control: "number"` przy `z.string()`
  kompilował się bez ostrzeżenia. Rozjazd wychodził dopiero w runtime i to skośnie: scaffolder bierze
  typ kolumny Drizzle z `control` (`tools/scaffold/src/be-templates.ts`), a wymagalność z Zoda
  (`tools/scaffold/src/descriptor.ts`) — efektem była kolumna `integer` w bazie przy walidacji stringa
  w API.
- Wartości `select` / `radio` trzeba było wpisać dwa razy: w `z.enum([...])` i w `options[]`.
  Encja `task` miała tak zadeklarowane dwa pola.
- `packages/schemas/README.md` dokumentował tabelę parowania `control` ↔ typ Zod z adnotacją
  „muszą być spójne" — czyli inwariant, którego kompilator nie sprawdza.

Bezpośrednim impulsem było pytanie o ergonomię: deklarowanie pól z podpowiedzi edytora, bez pamiętania
nazw kluczy metadanych i wymaganych dodatków per kontrolka.

## Considered options

1. **Buildery na poziomie pola (`f.*`) wpięte w `defineEntity`** — `fields` przyjmuje buildery,
   `schema` jest wywodzony. Pros: jedna deklaracja produkuje obie strony, więc rozjazd staje się
   niewyrażalny; `f.` wypisuje kontrolki w edytorze; wartości enuma wpisane raz; minimalna nowa
   powierzchnia API. Cons: `defineEntity` dostaje przeciążenie; buildery muszą odwzorować to,
   co dziś wyraża Zod bezpośrednio (potrzebny escape hatch).
2. **Buildery + osobny chain na poziomie encji** (`entity().labels().fields().build()`). Pros: więcej
   autocomplete (np. `displayField` z kluczy pól). Cons: druga równorzędna ścieżka definiowania encji
   obok `defineEntity` — sprzeczne z zasadą jednej konwencji w repo.
3. **Walidacja spójności w runtime** — sprawdzać parowanie `control` ↔ typ Zod przy starcie lub
   w scaffolderze. Pros: mało kodu, zero zmian w API. Cons: leczy objaw, nie przyczynę; nadal dwie
   deklaracje do utrzymania i podwójne listy opcji; błąd łapany później, nie w edytorze.
4. **Status quo** — zostawić inwariant w dokumentacji. Cons: pułapka, która realnie kosztowała czas
   przy każdej nowej encji.

## Decision

Wybieramy opcję 1. Fabryki `f.*` (`packages/schemas/src/lib/field-builder.ts`) tworzą pole razem
z jego schematem Zod; `defineEntity` dostaje przeciążenie, w którym `fields` to mapa builderów,
a `schema` wynika z pól. Wariant surowy (własny `schema` + metadane wprost) **zostaje** jako
udokumentowany escape hatch dla kształtów, których buildery nie wyrażają.

Zakres celowo ograniczony do **liftu 1:1** względem dzisiejszych możliwości `FieldMeta`: wynik
`defineEntity` jest nieodróżnialny od ręcznego, więc żaden konsument (scaffolder, `forms-ui`,
`api-react`) nie wymagał zmiany. Braki wykraczające poza dzisiejsze możliwości — kontrolka `datetime`
(dziś `date` gubi godzinę w formularzu) i deklaracja unikalności (`unique`) — są **poza tym ADR**;
zostaną rozstrzygnięte, gdy pilot DX potwierdzi ich koszt.

Uzupełniająco: etykieta pominięta w `.label()` wywodzi się z nazwy pola (`dueDate` → „Due date",
`venueId` → „Venue"). Po migracji encji referencyjnych jawnej etykiety wymagało 1 pole z 18.

## Consequences

- **Positive:** rozjazd `control` ↔ typ Zod jest niewyrażalny, nie tylko odradzany. Wartości list
  zamkniętych wpisane raz. Deklaracja pola jest krótsza (encja `project`: 40 → 24 linie) i odkrywalna
  z edytora. Buildery są niemutowalne, więc definicje pól da się współdzielić.
- **Negative / costs:** `defineEntity` ma dwa warianty — przy błędnym użyciu komunikat inferencji jest
  dłuższy niż przy jednej sygnaturze. Buildery pokrywają podzbiór Zoda; bogatsza walidacja wymaga
  `.zod(fn)`, co jest dodatkowym pojęciem do nauczenia. Mapa `wartość → etykieta` opiera się na
  kolejności kluczy obiektu — klucze numeryczne zmieniłyby kolejność opcji (udokumentowane).
- **Impact:** `packages/schemas` (nowy plik + przeciążenie + 3 encje referencyjne przepisane),
  dokumentacja (`README` pakietu, `CLAUDE.md`, przepis dodania encji). Scaffolder, `forms-ui`
  i `api-react` — **bez zmian**. Kontrolą regresji na kontrakcie jest brak nowej migracji Drizzle
  (`db:generate`) i pusty diff `openapi.json` po `generate:client` — schemat bazy i OpenAPI zależą
  od `control` oraz wymagalności, więc każdy rozjazd migracji encji by je poruszył.

## Notes

Dowód liftu 1:1 jest zautomatyzowany w `packages/schemas/test/field-builder.test.ts`: ta sama encja
zadeklarowana obiema drogami musi dać identyczne `fields`, identyczną kolejność i wymagalność kluczy
oraz identycznie zachowującą się `validation`.

---

_An ADR is immutable. Record any change of decision as a new ADR that references this one._
