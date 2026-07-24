# PLAN.md — Bootstrap TypeScript (BE + FE)

## Kontekst

Budujemy **bootstrap** (repozytorium startowe) dla projektów TypeScript BE+FE. Pełna, wiążąca
specyfikacja: `spec/bootstrap-opis-projektu.md`. Wszystkie decyzje architektoniczne w spec są
**rozstrzygnięte** — nie proponuj alternatyw (inny ORM, admin framework, silnik runtime zamiast
scaffoldera itd.). Filozofia: _bootstrap nie framework_ (fork & forget), _generator nie silnik
runtime_, _jedno źródło prawdy = schemat Zod + metadane_, _AI-first_, _konwencja nad konfiguracją_.

Ten plik jest jedynym źródłem stanu prac. **Przyszła sesja: przeczytaj PLAN.md i kontynuuj od
pierwszego nieodhaczonego zadania.** Nie wyprzedzaj faz — zależności są realne. Przy każdym
`[DECYZJA]` **zatrzymaj się i uzyskaj akceptację użytkownika** przed dalszą pracą.

## Jak używać tego pliku

- Zadania to checkboxy `- [ ]`. Odhaczaj po spełnieniu **Definition of Done fazy**, nie po samym napisaniu kodu.
- Fazę uznajemy za zamkniętą dopiero, gdy zielone CI + testy + **zaktualizowana dokumentacja AI w tym samym zakresie**. Nieaktualna dokumentacja = faza niezakończona.
- Nie implementuj niczego z sekcji „Poza zakresem" ani modułów opt-in (tylko przepisy/interfejsy).
- Nie dodawaj funkcjonalności „na zapas".

## Definition of Done — wspólne dla KAŻDEJ fazy

Oprócz DoD specyficznego dla fazy, zawsze:

- [ ] CI zielone (lint + typecheck + testy + build).
- [ ] Testy dla nowej funkcjonalności (Vitest; Playwright dopiero od fazy 6).
- [ ] Dokumentacja AI zaktualizowana w tym samym PR (`CLAUDE.md` / `AGENTS.md` / przepisy / inwentarz DS) — konwencje i granice opisane tam, gdzie się zmieniły.
- [ ] Granice pilnowane: w `packages/` **żadnych** importów routera (`@tanstack/react-router`) ani bundler-specyfiki (`import.meta.env`); env wstrzykiwany jawnie. Katalog `design-system/` **read-only**.
- [ ] Konwencje nazewnicze i API zachowane (patrz CLAUDE.md).
- [ ] PR wg szablonu (what/why, testy, ryzyka, rollback; od fazy 9 także sekcja „wpis changeloga").

## Punkty [DECYZJA] (wymagają akceptacji użytkownika)

1. **Faza 4 — format metadanych encji** rozszerzających schemat Zod (etykiety, widoczność/kolejność kolumn, typy pól formularza, pola relacji). Zaprojektuj propozycję na starcie fazy 4 i **zatrzymaj się** — od tego zależy scaffolder (faza 8) i formularze (faza 7).
2. **Faza 8 — kontrakt scaffoldera**: interfejs komendy, co dokładnie generuje, gdzie rejestruje (rejestry vs kotwice). Zaprojektuj i **zatrzymaj się** przed pisaniem szablonów.
3. **Faza 4 (lekki) — wybór encji referencyjnej**: patrz Założenie A. Potwierdź nazwę/pola przy okazji [DECYZJA] #1.

## Przyjęte założenia (jawne — do korekty przez użytkownika)

- **A. Encja referencyjna**: neutralna, domenowo-pusta. Propozycja: `Product` (pola pokrywające wszystkie typy pól DS: text, textarea, select/enum status, switch `isActive`, number `price`, date `publishedAt`) **+ minimalna `Category`** dla relacji 1:N, żeby wymusić combobox z async-search (pole relacji). Ostateczna nazwa/pola potwierdzone przy [DECYZJA] #1.
- **B. Error tracking (Sentry przez abstrakcję)** wpięty w fazie 1 razem z globalnym handlerem błędów — jedno cross-cutting wejście, nie osobna faza. Adapter dev = no-op/console, adapter prod = Sentry.
- **C. `AGENTS.md`** utrzymywany jako cienki wskaźnik do `CLAUDE.md` (jedno źródło, brak dryfu). Treść zwiniętego `RULES.md` ląduje w `CLAUDE.md`; `RULES.md` usuwany. Szablony `adr-template.md` i `pull-request-template.md` zostają i są rozwijane.
- **D. `design-system/`** to na teraz zwykły katalog-placeholder (mock na prymitywach HTML + Tailwind) w docelowej ścieżce montowania subtree; interfejsy komponentów zgodne z inwentarzem sekcji 10, tak by podmiana na prawdziwy subtree nie ruszała `packages/ui` ani `packages/forms-ui`. Reguła „DS read-only" obowiązuje od fazy 0. Komponenty dorabiane just-in-time (fazy 6/7), nie na zapas.
- **E. Paginacja** offset-based w core; cursor-based tylko jako przepis.
- **F. Aktualność dokumentacji AI** pilnowana pozycją w szablonie PR; automatyczny check CI pozostaje otwartą kwestią (sekcja 13 spec) — nie implementujemy go teraz.

---

## Faza 0 — Fundament (monorepo, config, DX, dokumentacja AI)

Cel: szkielet monorepo, na którym wszystko dalej stoi, oraz reguły dla agentów od dnia pierwszego.

- [x] Inicjalizacja monorepo: `pnpm` workspaces + Turborepo (`turbo.json` z pipeline lint/typecheck/test/build). Node 22 LTS (`.nvmrc`, `engines`).
- [x] Struktura katalogów wg spec sekcja 3: `apps/{api,web,admin}`, `packages/{schemas,api-client,api-react,forms,forms-ui,ui,config}`, `design-system/` (placeholdery/README na tym etapie).
- [x] `packages/config`: współdzielone `tsconfig` (TS strict wszędzie), ESLint (w tym reguła zakazu importów routera i `import.meta.env` w `packages/`), Prettier. Skonsumowane przez root i pakiety.
- [x] `docker-compose.yml`: Postgres + mailhog. `.env.example` z opisem zmiennych.
- [x] CI skeleton (GitHub Actions): install → lint → typecheck → test → build na Turborepo.
- [x] Dokumentacja AI — start:
  - [x] Zwiń `RULES.md` do `CLAUDE.md` (konwencje, granice, priorytety); usuń `RULES.md`; `AGENTS.md` jako wskaźnik do `CLAUDE.md` (Założenie C).
  - [x] W `CLAUDE.md` zapisz twarde granice: „DS read-only", „w `packages/` bez routera i `import.meta.env`", struktura monorepo, komendy.
  - [x] Katalog `docs/` na przepisy; `docs/adr/` z użyciem `adr-template.md`. Stub „inwentarza komponentów DS" (sekcja 10) w `design-system/` lub `docs/`.
- [x] `design-system/README.md`: to placeholder przyszłego git subtree; **read-only**; jak zostanie podmieniony (przepis „jak zaktualizować DS" — szkic).

**DoD fazy 0:** `pnpm install` + `pnpm turbo run lint typecheck build` przechodzą na pustym szkielecie; docker-compose wstaje (Postgres+mailhog); CLAUDE.md/AGENTS.md opisują strukturę, komendy i granice; RULES.md usunięty, treść przeniesiona.

## Faza 1 — API skeleton (Fastify + Zod, config, logging, błędy, OpenAPI)

Cel: działające `apps/api` z konwencjami, bez domeny.

- [x] `apps/api` na Fastify + `fastify-type-provider-zod`; struktura modułowa (katalog = moduł) + rejestr do montowania routerów (`// scaffolder:routes — do not remove`).
- [x] Walidowana konfiguracja env (Zod) — parsowanie i fail-fast przy starcie; typy env.
- [x] Structured logging: pino (JSON, poziomy, `correlation_id`/request id).
- [x] Globalny handler błędów → **RFC 7807 (problem+json)**; spójne mapowanie błędów walidacji Zod i błędów domenowych.
- [x] Abstrakcja error-trackingu + adapter Sentry (Założenie B); wpięta w handler błędów; adapter dev = no-op/console.
- [x] Konwencja `/api/v1` (prefix ścieżki, bez dodatkowej maszynerii). Endpoint `/health`.
- [x] Generowanie OpenAPI ze schematów Zod (`zod-openapi`) + serwowanie spec (np. `/api/v1/openapi.json`). Spec nigdy pisany ręcznie.
- [x] Konwencje odpowiedzi list: kształt paginacji offset-based (do użycia od fazy 4).
- [x] Testy Vitest: config-fail-fast, mapowanie błędów na 7807, obecność `/health` i spec OpenAPI.
- [x] Przepis-szkic „struktura modułu API" + aktualizacja CLAUDE.md (konwencje API, format błędów, logowanie).

**DoD fazy 1:** API startuje z walidowanym env; `/health` i OpenAPI działają; błędy w formacie 7807; logi strukturalne; testy zielone.

## Faza 2 — Baza (Drizzle, migracje, seedy, konwencje audytu i soft delete)

Cel: warstwa danych i konwencje, na których stanie auth i encja referencyjna.

- [x] Integracja Drizzle + połączenie do Postgresa z walidowanego configu.
- [x] Pipeline migracji (generowanie + apply) wpięty w skrypty i CI (migracje na testowej bazie).
- [x] Konwencja **pól audytowych** (`createdAt`, `updatedAt`, `createdBy`) i **soft delete** (`deletedAt`) jako współdzielony helper/mixin schematu.
- [x] Infrastruktura seedów (idempotentne).
- [x] Repository pattern: cienka konwencja dostępu do danych (bez logiki biznesowej w SQL).
- [x] Testy Vitest: migracje przechodzą; helper audytu/soft delete działa; seed idempotentny.
- [x] Przepis „jak dodać migrację" + aktualizacja CLAUDE.md (konwencje bazy: audyt, soft delete, expand→migrate→contract).

**DoD fazy 2:** migracje i seedy działają lokalnie i w CI; konwencje audytu/soft delete udokumentowane i pokryte testem.

## Faza 3 — Auth (userzy, sesje/tokeny, RBAC, provider tożsamości, reset hasła)

Cel: nieopcjonalny auth (CRUD/admin/`createdBy` na nim wiszą), z granicą modularności na metodzie logowania.

- [x] Tabela userów (+ migracja) z polami audytowymi.
- [x] Sesje/tokeny **z refreshem**; middleware autoryzacji.
- [x] **Interfejs providera tożsamości** + pierwsza implementacja **email+hasło** (hash, logowanie); struktura pod dokładanie kolejnych providerów w projektach.
- [x] Proste **RBAC** (role na poziomie usera) + guard na endpointach.
- [x] **Reset hasła** → **abstrakcja mailera** (adapter dev = mailhog, adapter prod). Mailer jako interfejs.
- [x] Wsparcie **admina na subdomenie od razu**: cookies `.domena` lub tokeny + **CORS na dwa originy** (web + admin).
- [x] Endpointy auth w `/api/v1` + wpisy OpenAPI.
- [x] Testy Vitest: login/refresh, guard RBAC, reset hasła (mail przez mailhog/adapter), CORS dwa originy.
- [x] Przepis **„jak dodać providera tożsamości"** + aktualizacja CLAUDE.md (auth, RBAC, mailer, model subdomeny/CORS).

**DoD fazy 3:** pełny flow email+hasło + reset przez mailhog; RBAC egzekwowane; sesje z refreshem; admin-subdomena (cookies/CORS) obsłużona; testy zielone.

## Faza 4 — Encja referencyjna (slice BE) — kod wzorcowy pisany RĘCZNIE

Cel: kompletny moduł encji jako wzorzec, z którego POWSTANIE scaffolder (nie odwrotnie).

- [ ] **[DECYZJA] #1 — format metadanych encji** (etykiety, widoczność/kolejność kolumn, typy pól formularza, pola relacji). Zaprojektuj propozycję rozszerzającą schemat Zod, przedstaw i **ZATRZYMAJ SIĘ do akceptacji**. Potwierdź też wybór encji referencyjnej (Założenie A / [DECYZJA] #3).
- [ ] `packages/schemas`: pierwszy schemat Zod encji referencyjnej **+ metadane** (wg zaakceptowanego formatu). Czysty TS, zero zależności.
- [ ] Schemat Drizzle encji (i minimalnej encji relacyjnej) + migracja; pola audytowe + soft delete z konwencji.
- [ ] Endpointy CRUD w module domenowym: list (**paginacja offset + sortowanie + filtrowanie po kolumnach**), get, create, update, delete (soft). Walidacja req/res ze schematów Zod.
- [ ] Relacja **1:N** obsłużona (M:N z atrybutami — poza zakresem generatora, tylko przepis później).
- [ ] Wpisy OpenAPI generowane ze schematów; rejestracja modułu w rejestrze routerów (kotwica).
- [ ] Testy Vitest: CRUD, paginacja/sortowanie/filtrowanie, walidacje, soft delete, `createdBy`.
- [ ] Przepis **„jak dodać encję (krok po kroku)"** — pisany jako dokument-wzorzec (późniejsza specyfikacja scaffodera). Aktualizacja CLAUDE.md.

**DoD fazy 4:** encja referencyjna w pełni działa przez API (CRUD+paginacja+filtry) z jednym źródłem prawdy (schemat+metadane → Drizzle → walidacja → OpenAPI); testy zielone; przepis „jak dodać encję" opisuje dokładnie ten moduł.

## Faza 5 — Klient API (generowany z OpenAPI + bindingi React Query)

Cel: type-safe konsumpcja API z jednego źródła prawdy.

- [ ] `packages/api-client`: klient TS **generowany z OpenAPI** (framework-agnostic, `fetch`; env/baseURL wstrzykiwany jawnie — bez `import.meta.env`). Skrypt generowania wpięty w pipeline.
- [ ] `packages/api-react`: bindingi **TanStack Query** nad klientem (hooki per zasób) — TanStack Query dozwolony w `packages/`.
- [ ] Hooki dla encji referencyjnej (list/get/create/update/delete) jako wzorzec.
- [ ] Testy Vitest: generacja klienta zgodna ze spec; hooki (mock transport).
- [ ] Przepis „jak regenerować klienta po zmianie API" + aktualizacja CLAUDE.md.

**DoD fazy 5:** klient generuje się z OpenAPI; hooki React Query dla encji referencyjnej działają; granica pakietów zachowana (bez routera/bundlera); testy zielone.

## Faza 6 — Skorupy FE + admin (Vite + React + TanStack Router), DataTable, e2e

Cel: cienkie skorupy `apps/web` i `apps/admin` na wspólnych pakietach; admin z widokami encji referencyjnej. **Tu wchodzi Playwright (cały e2e).**

- [ ] `apps/web` i `apps/admin`: Vite + React + TanStack Router; env wstrzykiwany do pakietów jawnie na starcie skorupy.
- [ ] `apps/admin`: layout admina + menu/routing **renderowane z rejestru encji/modułów** (kotwica dla scaffodera).
- [ ] Dorobienie just-in-time komponentów DS (mock) z inwentarza sekcji 10 potrzebnych dla listy/detalu: prymitywy tabeli, pagination, modal, toast, skeleton/spinner (reguła DS read-only utrzymana).
- [ ] `packages/ui`: **DataTable** (paginacja/sortowanie/filtrowanie po kolumnach), layout admina, `EmptyState` — kompozycje **na** DS.
- [ ] Widoki admina dla encji referencyjnej: lista (DataTable), detal, usuwanie (create/edit dopiero po fazie 7 lub tymczasowo surowe — patrz DoD).
- [ ] **Playwright: konfiguracja + wpięcie w CI + pierwsze scenariusze e2e** (login, lista/detal encji referencyjnej w adminie, weryfikacja dwóch originów).
- [ ] Testy: Vitest dla `packages/ui`; Playwright e2e jak wyżej.
- [ ] Przepis „struktura skorupy FE / jak dodać widok" + aktualizacja CLAUDE.md (granica React-tak/router-nie w praktyce).

**DoD fazy 6:** web i admin startują na wspólnych pakietach; admin pokazuje listę+detal encji referencyjnej przez DataTable; e2e (login + admin) zielone w CI; żaden przeciek routera/bundlera do `packages/`.

## Faza 7 — Silnik formularzy (`packages/forms` headless + `packages/forms-ui`)

Cel: headless silnik + renderery na DS; formularz encji referencyjnej jako pierwszy konsument.

- [ ] `packages/forms` (headless): definicja formularza (pola + walidacje per pole + walidacje międzypolowe + zależności/warunkowa widoczność + kroki wizarda) + handler submitu jako dowolna funkcja. Bez komponentów.
- [ ] `packages/forms-ui`: renderery mapujące **typ pola → komponent DS** (mapping **jawny i udokumentowany**). Dorobienie just-in-time komponentów DS pól: input, textarea, select, combobox async-search, checkbox, radio, switch, date picker, tabs/stepper.
- [ ] Formularz CRUD dla encji referencyjnej: definicja wywiedziona ze schematu+metadanych (faza 4), handler zapisujący przez api-react (faza 5). Wpięcie create/edit w admina (faza 6).
- [ ] Testy Vitest: walidacje per pole i międzypolowe, warunkowa widoczność, kroki wizarda, mapping pól; e2e (Playwright) create/edit encji referencyjnej.
- [ ] Przepis „jak zdefiniować formularz / dodać typ pola" + udokumentowany mapping typ→komponent; aktualizacja CLAUDE.md.

**DoD fazy 7:** create/edit encji referencyjnej działa przez silnik formularzy na DS; mapping typ→komponent udokumentowany; save&resume świadomie POMINIĘTE (opt-in, tylko przepis w fazie 9); testy zielone.

## Faza 8 — Scaffolder (uogólnienie kodu z faz 4–7)

Cel: generator wyciągnięty z istniejącego kodu wzorcowego — szablony powstają z encji referencyjnej, nie odwrotnie.

- [ ] **[DECYZJA] #2 — kontrakt scaffoldera**: interfejs komendy (`add entity …`), co generuje (schemat+metadane, Drizzle+migracja, endpointy CRUD, wpisy OpenAPI, widoki admina, formularz, hooki), gdzie i jak rejestruje (rejestry vs kotwice `// scaffolder:… — do not remove`). Zaprojektuj i **ZATRZYMAJ SIĘ do akceptacji**.
- [ ] Szablony wygenerowane przez uogólnienie modułu encji referencyjnej (fazy 4–7) — parametryzacja po schemacie+metadanych.
- [ ] Registry pattern + kotwice: generator dopisuje jedną rejestrację (linia w indeksie lub plik w konwencjonalnym katalogu). **Bez parsowania AST / inteligentnego mergowania** — konwencja + kotwice; reszta w przepisach.
- [ ] Zakres: relacje **1:N — tak**; M:N z atrybutami — **poza generatorem** (przepis ręczny); soft delete + audyt — domyślnie; upload — opt-in; full-text — poza zakresem.
- [ ] Test: wygenerowanie nowej encji generatorem daje moduł równoważny wzorcowi (kompiluje się, testy generowanego CRUD przechodzą, widoki i formularz działają).
- [ ] Przepis **„jak dodać encję"** finalizowany **równolegle z generatorem** (ten sam proces = dokumentacja + instrukcja agenta + spec scaffodera). Aktualizacja CLAUDE.md.

**DoD fazy 8:** `add entity` generuje kompletny, działający moduł end-to-end (BE+admin+formularz+klient) rejestrowany przez rejestry/kotwice; przepis i generator opisują ten sam proces i się nie rozjeżdżają; testy zielone.

## Faza 9 — Domknięcie (changelog-przepisy, wersjonowanie, dokumentacja, opt-in)

Cel: pętla aktualizacji przez instrukcje + komplet dokumentacji AI + przepisy modułów opt-in (bez implementacji).

- [ ] `CHANGELOG.md`: format **wpisów-przepisów pod agenta** (co naprawiono, dlaczego, jak znaleźć fragment w projekcie, czym zastąpić).
- [ ] `BOOTSTRAP_VERSION` (data/hash) — stemplowany przy starcie projektu; wyznacza od którego wpisu czytać.
- [ ] Szablon PR rozszerzony o sekcję **„wpis changeloga"** (`pull-request-template.md`).
- [ ] Komplet dokumentacji AI: `CLAUDE.md`/`AGENTS.md` (architektura, komendy, konwencje, granice), README per moduł z nieoczywistymi regułami, **inwentarz komponentów DS z przykładami** (finalny), przepisy: „jak dodać encję", „jak dodać providera tożsamości", „jak zaktualizować DS", „jak regenerować klienta". Część przepisów opcjonalnie jako komendy/skille.
- [ ] **Przepisy modułów opt-in — TYLKO przepisy/interfejsy, zero implementacji**: multi-tenancy (organizacje/zaproszenia/role per org — dotyka schematu, przepis), upload plików (abstrakcja storage — interfejs+przepis), save & resume wizardów (persystencja częściowego stanu — przepis), OpenTelemetry (przepis), kolejki/background jobs (przepis).
- [ ] Przepis „paginacja cursor-based" (dla publicznych list) jako uzupełnienie offset-based z core.

**DoD fazy 9:** changelog-przepisy + BOOTSTRAP_VERSION + szablon PR gotowe; dokumentacja AI kompletna i spójna z kodem; moduły opt-in obecne wyłącznie jako przepisy/interfejsy; jawnie poza zakresem — nietknięte.

---

## Poza zakresem (przeniesione ze spec — NIE naruszać w kolejnych sesjach)

**Jawnie poza zakresem** (spec sekcja 2 / 6): płatności, i18n, feature flagi, pełnotekstowe
wyszukiwanie (filtrowanie po kolumnach wystarcza), social login w core (to kolejny provider
tożsamości implementowany w projektach), SSR w domyślnej skorupie FE, relacje **M:N z atrybutami**
na tabeli pośredniej w generatorze (tylko przepis ręczny), parsowanie AST / inteligentne mergowanie
w scaffolderze.

**Moduły opt-in — tylko przepisy/interfejsy, NIGDY implementacja w bootstrapie**: multi-tenancy,
upload plików (abstrakcja storage), save & resume dla wizardów, OpenTelemetry (tracing),
kolejki / background jobs.

**Zasady twarde przez cały czas**: DS read-only; w `packages/` bez routera i `import.meta.env`;
API additywne / wersjonowane; baza expand→migrate→contract; brak funkcjonalności „na zapas";
przy niejasności — pytanie do użytkownika, nie założenie.

## Weryfikacja (jak testować, że działa)

- **Per faza**: `pnpm turbo run lint typecheck test build` zielone; docker-compose (Postgres+mailhog) podniesiony do testów integracyjnych/e2e.
- **Faza 1–5**: Vitest (unit/integration) — API, migracje, auth, klient.
- **Faza 6+**: dodatkowo Playwright e2e (login, admin lista/detal/CRUD encji referencyjnej, dwa originy).
- **Faza 8**: wygeneruj testową encję generatorem i potwierdź, że moduł kompiluje się, testy CRUD przechodzą, a widoki/formularz działają — równoważnie do encji referencyjnej.
- **Granice**: lint reguła w `packages/config` blokuje importy routera i `import.meta.env` w `packages/`; przeciek wychodzi natychmiast dzięki `apps/admin` na tych samych pakietach.
