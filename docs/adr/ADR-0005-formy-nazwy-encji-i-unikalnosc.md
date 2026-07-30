# ADR-0005: Formy nazwy encji w scaffolderze i unikalność w modelu encji

- **Status:** Accepted
- **Date:** 2026-07-30
- **Authors:** zespół bootstrap
- **Related:** ADR-0004 (buildery pól), `tools/scaffold`, `packages/schemas`, pilot DX (`docs/dx-pilot/konferencja.md`)

## Context

Pilot DX doszedł do encji `TalkSpeaker` (obsada prelekcji — M:N z atrybutami) i odsłonił dwie dziury,
które dla dotychczasowych encji były niewidoczne.

**1. Jeden napis w czterech rolach.** Scaffolder używał `entity.plural` jednocześnie jako nazwy stałej
Drizzle (`export const ${plural}`), nazwy tabeli (`pgTable("${plural}")`), ścieżki API
(`/api/v1/${plural}`) oraz nazw katalogu i plików modułu. Dla `projects` / `tasks` / `comments`
wszystkie cztery formy są identyczne, więc nikt tego nie zauważył. Pierwsza encja wielowyrazowa nie ma
poprawnego wyboru: `talkSpeakers` daje tabelę `talkSpeakers` (camelCase przy kolumnach snake_case, bo
te były snake'owane osobno przez `camelToSnake`) i ścieżkę `/api/v1/talkSpeakers` łamiącą konwencję
kebab-case z `CLAUDE.md`; `talk-speakers` daje `export const talk-speakers = …`, czyli kod, który się
nie kompiluje.

**2. Brak unikalności w modelu.** Encja nie potrafiła wyrazić `unique` w żadnej formie. Pilot
potrzebuje tego w trzech miejscach naraz: `Event.slug` (globalnie), e-mail uczestnika w obrębie
wydarzenia (para) i para `(talkId, speakerId)` w obsadzie. Bez tego duplikaty wchodzą do bazy,
a jedynym obejściem jest ręcznie dopisywany indeks w migracji — poza jedynym źródłem prawdy.

Dodatkowo trzeba było rozstrzygnąć, jak unikalność współgra z **soft delete**, który jest domyślny
w każdej tabeli. Istniejące `users.email` używa zwykłego `.unique()`, więc miękko usunięty user
rezerwuje swój adres na zawsze — zachowanie, którego nie chcemy powtarzać w generatorze.

## Considered options

**Formy nazwy:**

1. **Wyprowadzać cztery formy z `plural`** — deskryptor liczy `plural` (camelCase), `table`
   (snake_case), `path` i `file` (kebab-case). Pros: encje wielowyrazowe działają bez wiedzy autora
   encji; zapis wejściowy dowolny; encje jednowyrazowe bez zmiany. Cons: cztery pola w deskryptorze
   zamiast jednego — szablony muszą wybierać właściwe.
2. **Wymagać czterech pól w encji** (`plural`, `tableName`, `apiPath`, …). Cons: przenosi problem na
   autora encji i mnoży okazje do niespójności.
3. **Zabronić encji wielowyrazowych** (walidacja przy generacji). Cons: `orderItem`, `userGroup`,
   `talkSpeaker` to zwykłe encje — zakaz jest arbitralny.

**Unikalność:**

1. **Deklaracja w encji + częściowy indeks unikalny** (`where deleted_at is null`) + mapowanie
   konfliktu na 409. Pros: jedno źródło prawdy; soft delete zwalnia wartość; API zwraca poprawny kod
   błędu z nazwami pól. Cons: dwa miejsca deklaracji (pole vs encja) dla przypadku jedno- i
   wielopolowego; indeks częściowy jest mniej oczywisty w migracji niż `UNIQUE`.
2. **Zwykłe `UNIQUE`** (jak `users.email`). Pros: prostsze. Cons: miękko usunięty rekord blokuje
   wartość bezterminowo — przy soft delete jako domyślnym to pułapka.
3. **Tylko walidacja w service** (sprawdź przed zapisem). Cons: wyścig między sprawdzeniem a zapisem;
   baza nadal przyjmie duplikat.

## Decision

Obie opcje 1.

Deskryptor scaffoldera (`tools/scaffold/src/descriptor.ts`) rozbija nazwę na słowa niezależnie od
zapisu wejściowego (`talkSpeakers`, `talk-speakers`, `talk_speakers` dają ten sam wynik) i wyprowadza
cztery formy: `plural` do identyfikatorów w kodzie, `table` do nazwy tabeli, `path` do ścieżek API
i admina, `file` do katalogu i nazw plików. `entity.name` musi pozostać identyfikatorem camelCase,
bo scaffolder składa z niego nazwę eksportu `<name>Entity` — nieprawidłowa nazwa jest odrzucana
z komunikatem.

Unikalność deklaruje encja: `.unique()` na polu (jednopolowa) oraz `unique: [["eventId", "email"]]`
na encji (złożona); obie trafiają do `entity.unique`. Scaffolder generuje z każdej grupy **częściowy
indeks unikalny** z `where deleted_at is null`, a service mapuje naruszenie na `ConflictError` (409)
z nazwami pól — rozpoznając je po deterministycznej nazwie indeksu (`<table>_<kolumny>_key`) przez
helper `apps/api/src/db/unique-violation.ts`.

Przy okazji rozstrzygnięto zakres M:N z atrybutami: tabela łącząca z własnymi polami to **zwykła
encja z dwiema relacjami** i jest w pełni scaffoldowalna. Poza generatorem zostaje wyłącznie UX
przypisania — trasy zagnieżdżone (`/talks/:id/speakers`) i widget obsady na detalu rodzica. Poprzedni
zapis „M:N z atrybutami poza generatorem" był mylący i został poprawiony w `tools/scaffold/README.md`.

## Consequences

- **Positive:** encje wielowyrazowe działają bez obejść, a nazwa tabeli jest spójna ze snake_case
  kolumn. Ścieżki API trzymają konwencję kebab-case. Unikalność żyje w jedynym źródle prawdy i daje
  409 zamiast 500. Soft delete nie rezerwuje unikalnych wartości bezterminowo.
- **Negative / costs:** szablony muszą świadomie wybierać formę nazwy — użycie `plural` tam, gdzie
  powinna być `table` albo `path`, jest cichym błędem (dlatego pilnują tego testy generatora).
  Unikalność ma dwa miejsca deklaracji zależnie od liczby pól. Częściowy indeks unikalny jest
  niestandardowy względem `users.email`, które zostaje na zwykłym `UNIQUE` (nie migrujemy go —
  zmiana zachowania rejestracji to osobna decyzja).
- **Impact:** `tools/scaffold` (deskryptor + wszystkie szablony + nowy zestaw testów),
  `packages/schemas` (`.unique()`, `entity.unique`), `apps/api/src/db/unique-violation.ts`,
  `apps/admin/src/relation-source.ts` (ścieżka relacji kebab-case). Encje jednowyrazowe generują
  **identyczny** kod jak przed zmianą — pilnuje tego test regresyjny.

## Notes

Wygenerowany fragment Drizzle (`pgTable` z częściowym indeksem unikalnym) został skompilowany
względem `drizzle-orm@0.38.4` osobno, przed dodaniem do szablonu — API trzeciego argumentu `pgTable`
zmieniało się między wersjami (obiekt → tablica) i wymagało potwierdzenia.

---

_An ADR is immutable. Record any change of decision as a new ADR that references this one._
