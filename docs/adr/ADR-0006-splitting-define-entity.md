# ADR-0006: Rozdzielenie `defineEntity` na dwie funkcje zamiast przeciążenia

- **Status:** Accepted
- **Date:** 2026-07-30
- **Authors:** zespół bootstrap
- **Related:** ADR-0004 (buildery pól — zastępuje jego decyzję o przeciążeniu), `packages/schemas`

## Context

ADR-0004 wprowadził buildery pól `f.*` i wpiął je w istniejącą funkcję `defineEntity` jako
**przeciążenie**: pierwsza sygnatura przyjmowała mapę builderów, druga surowy `schema` + companion-mapę
metadanych. Celem była minimalna powierzchnia API — jedna nazwa dla obu wariantów. ADR-0004 odnotował
koszt: „przy błędnym użyciu komunikat inferencji jest dłuższy niż przy jednej sygnaturze".

W praktyce koszt okazał się wyższy, niż zakładano. Podczas pilotu DX ten sam problem uderzył
**trzykrotnie w jednej sesji** (błędny `displayField`, płaska tablica w `unique`, `unique`
wskazujące pola innej encji). TypeScript przy nieudanym dopasowaniu przeciążenia raportuje
`TS2769: No overload matches this call`, a następnie dla **każdej** niepasującej właściwości powtarza
całą zinstancjonowaną sygnaturę generyczną. Efekt zmierzony na realnym przypadku (`unique` z dwoma
nieistniejącymi polami):

```
a.ts(3,18): error TS2769: No overload matches this call.
  Overload 1 of 2, '(definition: BuilderEntityDefinition<{ talkId: PlainFieldBuilder<ZodString,
  false>; speakerId: PlainFieldBuilder<ZodString, false>; role: PlainFieldBuilder<ZodEnum<[...]>,
  false>; }>): Entity<...>', gave the following error.
    Type '"eventId"' is not assignable to type '"role" | "talkId" | "speakerId"'.
  … (to samo powtórzone dla '"email"')
```

Osiem linii, a pozycja `(3,18)` wskazuje **wywołanie** `defineEntity({`, nie miejsce pomyłki —
w realnym pliku błąd raportowany był w linii 4, podczas gdy literówka siedziała w linii 16.

## Considered options

1. **Dwie osobne funkcje** — `defineEntity` (buildery) i `defineEntityRaw` (surowy schemat), każda
   z jedną sygnaturą. Pros: TypeScript raportuje błąd bezpośrednio na niepasującej właściwości,
   jednolinijkowym komunikatem; nazwa `Raw` sama tłumaczy, że to wyjście awaryjne. Cons: dwie nazwy
   w API; zmiana łamiąca dla forków używających wariantu surowego przez `defineEntity`.
2. **Zostawić przeciążenie** — Cons: koszt płacony przy każdej literówce w definicji encji, a encje
   pisze się często; problem potwierdzony empirycznie trzy razy w jednej sesji.
3. **Runtime-owa walidacja kształtu** przed inferencją (np. rzucanie czytelnego błędu przy płaskim
   `unique`). Cons: leczy jeden objaw, a nie klasę problemu — błąd i tak najpierw pojawia się jako
   ściana z `tsc`, zanim kod w ogóle się uruchomi.

## Decision

Opcja 1. `defineEntity` przyjmuje wyłącznie mapę builderów; `defineEntityRaw` przyjmuje własny
`schema` + companion-mapę metadanych. Obie mają po jednej sygnaturze i osobne ciało — dotychczasowa
implementacja rozgałęziała się przez `if ("schema" in definition)`, więc rozdzielenie to rozcięcie
w miejscu tego warunku.

Efekt zmierzony na tym samym pliku, który wygenerował wynik z sekcji Context:

```
a.ts(9,13): error TS2322: Type '"eventId"' is not assignable to type '"role" | "talkId" | "speakerId"'.
a.ts(9,24): error TS2322: Type '"email"' is not assignable to type '"role" | "talkId" | "speakerId"'.
```

Ta decyzja **zastępuje** ustalenie z ADR-0004 dotyczące przeciążenia. Pozostałe ustalenia ADR-0004
(buildery jako droga domyślna, wariant surowy jako escape hatch, lift 1:1) pozostają w mocy.

## Consequences

- **Positive:** błąd w definicji encji wskazuje konkretną właściwość zamiast całego wywołania,
  komunikat mieści się w jednej linii. Znika asymetria, w której jedna nazwa oznaczała dwa różne
  kontrakty. Nazwa `defineEntityRaw` czytelnie sygnalizuje, że to wyjście awaryjne.
- **Negative / costs:** dwie nazwy zamiast jednej. **Zmiana łamiąca dla forków**: projekt, który
  wystartował z bootstrapa i użył `defineEntity` z własnym `schema`, przestanie się kompilować —
  łamie się jednak głośno, na etapie kompilacji, a poprawka to zmiana nazwy wywołania. Wymaga wpisu-
  przepisu w `CHANGELOG.md` przy merge'u gałęzi `dx-test` do `main` (wpisy są na czas iteracji
  wstrzymane).
- **Impact:** `packages/schemas/src/lib/define-entity.ts` (~30 linii), jeden konsument wariantu
  surowego w repo (test równoważności w `packages/schemas/test/field-builder.test.ts`), dokumentacja
  (`README` pakietu, `CLAUDE.md`, przepis dodania encji). Encje referencyjne i encje pilota — bez
  zmian, wszystkie używają builderów. Zachowanie w runtime i kształt zwracanego obiektu
  identyczne — potwierdzone brakiem zmian w migracjach i pustym diffem `openapi.json`.

## Notes

Cena rozdzielenia to jedna asercja typu w ciele `defineEntity`: schemat jest składany dynamicznie
z builderów, więc jego typ wynika z konstrukcji, a nie z inferencji. Wcześniej tę samą asercję
ukrywała para przeciążeń — różnica polega na tym, że teraz jest widoczna i opisana komentarzem
w miejscu, w którym obowiązuje.

---

_An ADR is immutable. Record any change of decision as a new ADR that references this one._
