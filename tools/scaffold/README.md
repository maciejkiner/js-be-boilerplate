# tools/scaffold

Scaffolder encji: z encji `@repo/schemas` (jedyne źródło prawdy) generuje warstwy pochodne —
Drizzle + moduł API + hooki `api-react` + widoki admina + test CRUD — i rejestruje je przy kotwicach
(`// scaffolder:… — do not remove`). Bez parsowania AST, bez inteligentnego mergowania (spec sekcja 6).

## Użycie

```bash
# 1. Napisz encję (jedyne źródło prawdy) i wyeksportuj ją w packages/schemas/src/index.ts:
#    packages/schemas/src/<name>/<name>.entity.ts  (defineEntity: schemat Zod + metadane)

# 2. Wygeneruj resztę (pakiet @repo/schemas budowany jest automatycznie przed generacją):
pnpm scaffold <name>          # np. pnpm scaffold invoice

# 3. Kroki po (wypisywane przez CLI):
pnpm --filter @repo/api db:generate   # migracja ze schematu
pnpm generate:client                  # klient z OpenAPI
```

> Scaffolder czyta encję ze skompilowanego `dist` `@repo/schemas`, dlatego skrypt `scaffold`
> **buduje ten pakiet automatycznie** (jak `db:generate` dla drizzle-kit) — nie musisz pamiętać o `build`.

## Co generuje

| Warstwa   | Plik                                           | Rejestracja (kotwica)                                       |
| --------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Drizzle   | `apps/api/src/modules/<file>/<file>.schema.ts` | `db/schema.ts` (`schema-export`)                            |
| API       | `<file>.{dto,repository,service,routes}.ts`    | `modules/index.ts` (`entities-import`, `entities-register`) |
| api-react | `packages/api-react/src/<file>.ts`             | `api-react/src/index.ts` (`hooks-export`)                   |
| admin     | `apps/admin/src/entities/<file>.tsx`           | `registry.ts` (`admin-import`, `admin-entities`)            |
| test      | `apps/api/test/<file>.test.ts`                 | — (plik)                                                    |

Mapowanie `control` → Drizzle/Zod/komponent robione z metadanych; `required` z `schema.isOptional()`;
sort/filtry z `fields[].list`; `unique` z `entity.unique`. Generowane pliki są od razu formatowane
Prettierem.

Dwie rzeczy, o których trzeba pamiętać przy dopisywaniu szablonów:

- **`select` i `radio` to ta sama lista zamknięta** — różni je wyłącznie komponent na FE. W bazie,
  DTO, filtrach i kolumnach admina zachowują się identycznie, więc szablon pyta o to predykatem
  `isChoiceField()`, a nie porównaniem z `"select"`.
- **Importy w generowanym kodzie muszą być warunkowe.** `noUnusedLocals` traktuje nieużywany import
  jako błąd, a symbole takie jak `formatDate`, `Badge` czy `Select` pojawiają się tylko dla części
  encji (odpowiednio: pole `date`, lista zamknięta, filtr listy zamkniętej).

## Formy nazwy encji

`plural` encji jest używany w czterech różnych rolach, które **nie mają tej samej konwencji zapisu**.
Deskryptor wyprowadza je wszystkie z jednego napisu, więc encje wielowyrazowe działają bez obejść
(wpisz `talkSpeakers`, `talk-speakers` albo `talk_speakers` — wynik jest ten sam):

| Rola                                 | Forma        | Przykład        |
| ------------------------------------ | ------------ | --------------- |
| identyfikatory w kodzie (`d.plural`) | `camelCase`  | `talkSpeakers`  |
| nazwa tabeli w bazie (`d.table`)     | `snake_case` | `talk_speakers` |
| ścieżka API i admina (`d.path`)      | `kebab-case` | `talk-speakers` |
| katalog i nazwy plików (`d.file`)    | `kebab-case` | `talk-speakers` |

Dla encji jednowyrazowych wszystkie cztery formy są identyczne — dlatego `projects`/`tasks`/`comments`
niczego nie zauważają. `name` encji musi być poprawnym identyfikatorem camelCase (scaffolder składa
z niego nazwę eksportu `<name>Entity`) — inaczej generacja jest odrzucana z komunikatem.

## Zasady i ograniczenia

- **Nie nadpisuje** istniejących plików (odmawia). Rejestracje przy kotwicach są **idempotentne**
  (dedupe po stabilnym kluczu). Ponowna generacja: usuń wygenerowane pliki + cofnij wpisy przy kotwicach.
- **Zakres:** 1:N — tak (uuid + references + assertRelations + RelationSource). Soft delete + audyt —
  domyślnie. Unikalność (jedno- i wielopolowa) — tak, jako **częściowy** indeks unikalny
  (`where deleted_at is null`) + mapowanie konfliktu na 409 z listą pól w `errors`
  (`uniqueConflictError`), którą formularz zamienia na błąd przy kontrolce. Upload/full-text — poza
  zakresem.
- **M:N z atrybutami:** tabela łącząca z własnymi polami to **zwykła encja** z dwiema relacjami —
  scaffoldujesz ją normalnie i dostajesz warstwę danych, CRUD i widoki. Generator **nie** robi
  zagnieżdżonych tras (`/talks/:id/speakers`) ani widgetu przypisania na detalu rodzica — to
  dokładasz ręcznie, jeśli potrzebujesz właśnie takiego UX.
- Wygenerowany test CRUD tworzy prerekwizyty dla relacji do `project`/`user`; egzotyczne relacje —
  dostosuj test ręcznie.

Przepis end-to-end: `docs/recipes/jak-dodac-encje.md`.
