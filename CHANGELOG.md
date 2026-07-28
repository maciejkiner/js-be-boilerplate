# CHANGELOG — wpisy-przepisy pod agenta

Ten changelog jest **inny niż zwykły**: to nie lista zmian bootstrapa dla ludzi, lecz **przepisy dla
agenta w sforkowanym projekcie** — jak przenieść poprawkę do kodu, który już „odjechał" od bootstrapa.

## Pętla aktualizacji (fork & forget + opcjonalny backport)

1. Projekt startuje z forka bootstrapa; `BOOTSTRAP_VERSION` zapisuje wersję startową (data + hash).
2. Gdy chcesz przenieść poprawki: weź wpisy z tego pliku **nowsze** niż data w `BOOTSTRAP_VERSION`.
3. Dla każdego wpisu agent stosuje przepis (znajdź fragment → zastąp), bo pliki mogły zostać zmienione
   (nie zakładamy czystego `git merge` — kod jest własnością projektu). Po backporcie zaktualizuj
   `BOOTSTRAP_VERSION`.

## Format wpisu

```
## YYYY-MM-DD — krótki tytuł
- **Co:** co się zmieniło/naprawiło.
- **Dlaczego:** powód (jaki problem/ryzyko).
- **Jak znaleźć w projekcie:** ścieżki/wzorce do zlokalizowania fragmentu.
- **Co zrobić:** konkretna zmiana do zastosowania (przed/po lub kroki).
- **Ryzyko/rollback:** jeśli istotne.
```

---

## 2026-07-27 — Baseline (fazy 0–9)

- **Co:** pierwsza kompletna wersja bootstrapa (monorepo, API Fastify+Zod, Drizzle, auth, encja
  referencyjna, klient z OpenAPI, skorupy web/admin, silnik formularzy, scaffolder, konteneryzacja).
- **Dlaczego:** punkt wyjścia; kolejne wpisy będą przepisami do backportu.
- **Jak znaleźć w projekcie:** całe repo; `PLAN.md` opisuje fazy, `CLAUDE.md` konwencje.
- **Co zrobić:** nic — to punkt odniesienia. Ustaw `BOOTSTRAP_VERSION` na `2026-07-27 8694bcd`.

<!-- Nowe wpisy dodawaj NA GÓRZE (pod tym komentarzem), najnowsze pierwsze. -->

## 2026-07-28 — `FieldMeta` jako unia dyskryminowana po `control`

- **Co:** `FieldMeta` (metadane pola encji) z płaskiego interfejsu (wszystko opcjonalne) przerobione
  na **unię dyskryminowaną** `SimpleFieldMeta | ChoiceFieldMeta | RelationFieldMeta`. Typ wymusza
  teraz dodatki zależne od `control`: `select`/`radio` → `options` (wymagane), `relation` → `relation`
  (wymagane), pola proste → bez `options`/`relation` (`?: never`). README i JSDoc pełnią rolę
  katalogu wszystkich typów pól; type-level test (`@ts-expect-error`) pilnuje wymuszania.
- **Dlaczego:** metadane były niejednorodne, ale typ tego nie odzwierciedlał — można było zapomnieć
  `options` przy `select` albo dodać je do `text` i nic tego nie łapało do runtime'u.
- **Jak znaleźć w projekcie:** `packages/schemas/src/lib/define-entity.ts` (`FieldMeta` + warianty
  `*FieldMeta`); odczyty `meta.options`/`meta.relation` w `packages/forms-ui/src/derive-fields.ts`
  i `tools/scaffold/src/descriptor.ts` (działają bez zmian — `?: never` zachowuje dostęp do pól).
- **Co zrobić:** zastąp `interface FieldMeta {…}` bazą `FieldMetaBase` + trzema wariantami z
  dyskryminatorem `control` i unią `type FieldMeta = …`. Encje z poprawnymi metadanymi kompilują się
  bez zmian; niepoprawne (brak `options`/`relation`) dostaną błąd do naprawienia (to cel).
- **Ryzyko/rollback:** zmiana typu (nie runtime). Poprawne encje niezmienione; jeśli backport ujawni
  braki `options`/`relation`, uzupełnij je. Rollback = powrót do płaskiego `FieldMeta`.

## 2026-07-28 — Dokumentacja `defineEntity` + podłączenie pola `help`

- **Co:** (1) doprecyzowana dokumentacja `defineEntity` — JSDoc na `name`/`plural`/`label`/`labelPlural`,
  parowanie `control` ↔ typ Zod (który wymaga `options`/`relation`), przykład użycia i cross-linki;
  README `packages/schemas` dostał tabelę parowania i przykład. (2) Pole `FieldMeta.help` (dotąd
  martwe) jest teraz renderowane jako podpowiedź pod polem w `forms-ui`.
- **Dlaczego:** DX — pisząc encję od zera nie było wiadomo, jaki typ Zod paruje z danym `control`,
  co napędza `plural`, ani że `help` nie działa (zadeklarowane, nierenderowane → mylące).
- **Jak znaleźć w projekcie:** `packages/schemas/src/lib/define-entity.ts` (JSDoc `FieldControl`,
  `FieldMeta`, `EntityDefinition`, `defineEntity`); `packages/schemas/README.md`;
  `packages/forms-ui/src/{field-renderer.tsx,derive-fields.ts}` (`FieldDef.help`, render w `Field`).
- **Co zrobić:** przenieś JSDoc/README z komitu; w `forms-ui` dodaj `help?: string` do `FieldDef`,
  skopiuj `meta.help` w `deriveFields`, i wyrenderuj `field.help` w `Field` (hint `<p>` pod kontrolką,
  przed błędem). Tylko dokumentacja + addytywne renderowanie — brak zmian kontraktu.
- **Ryzyko/rollback:** brak (addytywne; encje bez `help` działają jak dotąd).
