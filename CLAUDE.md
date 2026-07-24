# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Instrukcje dla agenta AI i zespołu. Stosuj je do każdej zmiany. To jest **kanoniczne** źródło
konwencji (dawny `RULES.md` został tu zwinięty).

## Co to za repo

Bootstrap (repozytorium startowe) dla projektów TypeScript BE+FE. Wiążąca specyfikacja:
`spec/bootstrap-opis-projektu.md`. Plan budowy i stan prac: `PLAN.md` — **przeczytaj go i kontynuuj
od pierwszego nieodhaczonego zadania**; nie wyprzedzaj faz, przy `[DECYZJA]` zatrzymaj się po akceptację.
Filozofia: bootstrap nie framework (fork & forget), generator nie silnik runtime, jedno źródło prawdy
(schemat Zod + metadane), AI-first, konwencja nad konfiguracją.

## Struktura monorepo (pnpm + Turborepo)

```
apps/
  api      — Fastify + Zod, moduły domenowe montowane z rejestru        (Faza 1+)
  web      — domyślna skorupa: Vite + React + TanStack Router           (Faza 6)
  admin    — panel administracyjny, osobno deployowalny (subdomena)     (Faza 6)
packages/
  schemas    — schematy Zod encji/formularzy + metadane; czysty TS       (Faza 4)
  api-client — klient generowany z OpenAPI; framework-agnostic (fetch)   (Faza 5)
  api-react  — bindingi TanStack Query nad klientem                      (Faza 5)
  forms      — headless silnik formularzy                                (Faza 7)
  forms-ui   — renderery pól spięte z DS                                 (Faza 7)
  ui         — kompozycje na DS: DataTable, layout admina, EmptyState    (Faza 6)
  config     — współdzielone ESLint / Prettier / tsconfig                (jest)
design-system/ — DS jako git subtree (na razie placeholder; READ-ONLY)
docs/          — recipes (przepisy), adr/, ds-component-inventory.md
```

## Komendy

- `pnpm install` — instalacja (workspace).
- `pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm test` — przez Turborepo, cały monorepo.
- `pnpm format` / `pnpm format:check` — Prettier.
- `docker compose up -d` — Postgres (5432) + mailhog (SMTP 1025, UI 8025).
- Filtr do jednego workspace: `pnpm turbo run test --filter=@repo/<nazwa>`.
- API: `pnpm --filter @repo/api dev` (watch) / `build` / `start`. Pojedynczy test: `pnpm --filter @repo/api test -- <wzorzec>`.
- Baza: `pnpm --filter @repo/api db:generate` / `db:migrate` / `db:seed` / `db:studio`. Testy integracyjne DB wymagają `TEST_DATABASE_URL` (inaczej pomijane).
- Klient API: `pnpm generate:client` (zrzut OpenAPI ze schematów → typy klienta). Po każdej zmianie API; CI pilnuje aktualności (`git diff`).

## Stack (rozstrzygnięty — nie proponuj alternatyw)

Node 22 LTS · pnpm · Turborepo · TypeScript strict · PostgreSQL · Drizzle · Fastify + Zod
(`fastify-type-provider-zod`) · REST + OpenAPI (`zod-openapi`) + generowany klient · Vite + React +
TanStack Router/Query · Vitest + Playwright · pino · docker-compose (Postgres + mailhog) ·
error tracking przez abstrakcję + adapter Sentry · GitHub Actions.

## Granice twarde (pilnowane w review i lintcie)

- **DS read-only**: nie edytuj `design-system/`. Zmiany idą upstream albo przez `packages/ui`.
- **`packages/` bez skorupy**: żadnych importów routera (`@tanstack/react-router`) ani
  `import.meta.env`. React tak, TanStack Query tak; env wstrzykiwany jawnie przy inicjalizacji
  skorupy. Reguła egzekwowana przez `@repo/config/eslint-package`. `apps/admin` jako druga skorupa
  jest permanentnym testem tej granicy.
- **Moduły opt-in** (multi-tenancy, upload, save&resume, OTel, kolejki) i pozycje „poza zakresem"
  (patrz `PLAN.md`): nie implementuj — tylko przepisy/interfejsy.

## Priorytety (w tej kolejności)

1. Nie psuj istniejących funkcji (zero regresji).
2. Czytelność i utrzymywalność ponad spryt.
3. Testy i observability są częścią zmiany, nie dodatkiem.

## Zawsze

- Małe, jednotematyczne zmiany. Duże zadanie dziel na etapy.
- Testy dla logiki biznesowej i przypadków brzegowych, proporcjonalne do ryzyka.
- Warstwy oddzielone: BE controller → service → repository; FE logika oddzielona od prezentacji.
- Walidacja wejścia na granicy systemu (API) schematami Zod.
- Opisowe nazwy; boolean z `is`/`has`/`can`. Jedna konwencja w całym repo.
- Komentuj „dlaczego", nie „co".
- Structured logi (JSON) z poziomami i `correlation_id`; metryki i tracing dla kluczowych ścieżek.
- Ryzykowne nowe zachowanie za feature flagą.
- FE: obsłuż każdy stan UI (loading/error/empty/success); a11y jako wymaganie; pilnuj bundla.

## Nigdy

- Nie usuwaj/nie zmieniaj pól/endpointów API bez wersjonowania i sprawdzenia konsumentów.
- Nie rób niekompatybilnych zmian schematu — etapy expand → migrate → contract.
- Nie wkładaj sekretów/PII do kodu ani logów.
- Nie połykaj wyjątków po cichu — błędy obsługiwane jawnie i spójnie.
- Nie dodawaj abstrakcji „na zapas" ani nieużywanych zależności.
- Nie optymalizuj bez pomiaru (najpierw profiluj; ustaw budżety).

## Backward compatibility (krytyczne)

- Zmiany API są addytywne. Zmiana łamiąca = wersjonowanie + okres przejściowy.
- Baza: expand → migracja danych → contract. Każda zmiana produkcyjna ma plan rollbacku.
- Testy regresji i kontraktowe (BE↔FE) muszą przechodzić.

## Konwencje

- **Branch:** `type/opis-kebab-case` (feat, fix, refactor, chore, docs, test, hotfix); dodaj numer ticketu.
- **Commit:** `type(scope): opis` w trybie rozkazującym, małą literą, bez kropki. Breaking: `type(scope)!:` + `BREAKING CHANGE:`.
- **BE:** typy `PascalCase`, stałe `UPPER_SNAKE_CASE`, reszta wg konwencji języka.
- **FE:** komponenty `PascalCase`, hooki `useCamelCase`, reszta `camelCase`.
- **API:** ścieżki w liczbie mnogiej, `kebab-case`, prefix `/api/v1`; pola JSON spójne w całym API.
- **Błędy API:** RFC 7807 (problem+json), spójne z globalnym handlerem.
- **Paginacja:** offset-based w core; cursor-based jako przepis.
- **Baza (Drizzle):** pola audytowe (`created_at`/`updated_at`/`created_by`) i soft delete (`deleted_at`) przez helpery `src/db/columns.ts`; odczyty przez `notDeleted()`. Migracje generowane ze schematu (nie ręcznie; `drizzle-kit` czyta skompilowany `dist`, więc `db:generate` buduje najpierw), rejestrowane przy kotwicy w `src/db/schema.ts`. Zmiany łamiące: expand → migrate → contract. Seedery idempotentne. Przepis: `docs/recipes/jak-dodac-migracje.md`.
- **Encje:** jedno źródło prawdy = schemat Zod + metadane w `packages/schemas` (`defineEntity`: czysty `schema` + `validation` z `refine` międzypolowym + companion-map `fields`; parytet kluczy wymuszany typem). Etykiety encji/admina po angielsku. Tabela Drizzle w module API (enumy jako `text().$type<>()`, relacje przez `.references()` z jawnym `onDelete`). DTO wywiedzione z encji (`entity.validation`/`schema.partial()`/`schema.extend()`). Moduł: routes → service → repository, sort po allowliście kolumn, soft delete, `createdBy` z sesji. Rejestracja przy kotwicach `db/schema.ts` i `modules/index.ts`. Encje referencyjne: `Project`, `Task`. Przepis: `docs/recipes/jak-dodac-encje.md`.
- **Klient API:** `packages/api-client` = typy generowane z OpenAPI (`openapi-typescript`) + runtime `openapi-fetch` (framework-agnostic, `baseUrl` wstrzykiwany jawnie, `credentials: "include"`); `openapi.json` zrzucany ze schematów Zod (`apps/api openapi:dump`, offline), nigdy ręcznie. `packages/api-react` = bindingi TanStack Query nad klientem: `ApiProvider` (wstrzykuje klienta), hooki `use{Projects,Tasks,…}` + mutacje invalidujące `*Keys.all`, query-option factories testowalne bez React. Regeneracja: `pnpm generate:client` (CI pilnuje `git diff`). Przepis: `docs/recipes/jak-regenerowac-klienta.md`.
- **Auth:** email+hasło (argon2) jako pierwsza implementacja interfejsu providera tożsamości (`modules/auth/providers/`); sesje = access JWT (cookie) + refresh opaque hashowany (tabela `sessions`, rotacja); RBAC przez `roles` na userze + guard `requireRoles()` po `app.authenticate`; reset hasła przez abstrakcję mailera (`lib/mailer`, dev=mailhog); admin na subdomenie: CORS dwa originy + cookies (`COOKIE_DOMAIN`). Sekrety/tokeny trzymane wyłącznie jako hash. Przepis: `docs/recipes/jak-dodac-providera-tozsamosci.md`.

## Decyzje architektoniczne

- Znaczącą decyzję zapisuj jako ADR w `docs/adr/` (szablon `adr-template.md`). ADR jest immutable.

## Definition of Done

- [ ] Testy napisane i przechodzą, CI zielone.
- [ ] Zmiany API/bazy backward compatible lub wersjonowane.
- [ ] Logi/metryki/tracing dla nowej ścieżki (jeśli dotyczy).
- [ ] Brak sekretów/PII.
- [ ] Nazwy i konwencje zachowane; granice (DS read-only, packages bez routera/`import.meta.env`) nienaruszone.
- [ ] ADR dodany, jeśli to decyzja architektoniczna.
- [ ] **Dokumentacja AI zaktualizowana w tym samym PR** (`CLAUDE.md` / przepisy / inwentarz DS). Nieaktualna dokumentacja = zmiana niezakończona.
- [ ] Opis PR wg `pull-request-template.md` (co/dlaczego, testy, ryzyka, rollback).

## Gdy coś niejasne

Jeśli wymaganie, kontrakt API lub konwencja są niejednoznaczne — zapytaj lub zaproponuj opcje z
rekomendacją, zamiast zgadywać i wprowadzać niespójność.
