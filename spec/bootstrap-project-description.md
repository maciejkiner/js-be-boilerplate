# Bootstrap TypeScript (BE + FE) — opis projektu

## 1. Cel i filozofia

Repozytorium startowe dla nowych projektów w stacku TypeScript, pokrywające funkcjonalność wspólną dla większości aplikacji: API z autoryzacją, panel administracyjny z CRUD-em generowanym ze schematów danych oraz silnik formularzy. Celem jest skrócenie pierwszych tygodni projektu do dni, przy zachowaniu pełnej własności kodu przez projekt.

Zasady nadrzędne:

- **Bootstrap, nie framework.** Projekty startują przez skopiowanie repozytorium i od tego momentu są odcięte (fork & forget). Nie ma zależności technicznej między bootstrapem a projektami — jedynym kanałem zwrotnym jest changelog z przepisami migracyjnymi (sekcja 12).
- **Generator, nie silnik runtime.** CRUD, widoki admina i formularze są scaffoldowane jako zwykły kod, który projekt przejmuje na własność i dowolnie modyfikuje. Świadomie odrzucamy podejście deklaratywnego silnika interpretowanego w locie (styl Django admin / Strapi / React-Admin), bo każdy projekt w końcu trafia na przypadek nieprzewidziany przez silnik.
- **Jedno źródło prawdy dla kształtu danych.** Encja zdefiniowana raz (schemat Zod + metadane) napędza: schemat bazy i migracje, walidację BE i FE, typy, spec OpenAPI, klienta API, kolumny tabel w adminie oraz formularze.
- **AI-first.** Struktura, konwencje i dokumentacja projektowane tak, aby agent AI mógł samodzielnie poruszać się po repozytorium, dodawać encje według przepisów i aplikować poprawki z changeloga. Wszystko, co pomaga generatorowi (przewidywalna struktura, rejestry, konwencje zamiast magii), pomaga też agentom — i odwrotnie.
- **Konwencja nad konfiguracją.** Katalog = moduł, znane kształty plików, auto-discovery przez rejestry.
- **Kryterium zakresu.** Funkcjonalność należy do core, jeśli: (a) potrzebuje jej zdecydowana większość projektów, (b) da się ją zaimplementować bez wiedzy domenowej, (c) nie wymusza decyzji biznesowych na przyszłym projekcie. Jeśli któryś warunek pada — jest to moduł opt-in albo pozostaje poza zakresem.

## 2. Zakres funkcjonalny

### Core (zawsze w projekcie)

- Struktura API REST z konwencjami: format błędów, paginacja, wersjonowanie (sekcja 8).
- Spec OpenAPI generowany ze schematów Zod + wygenerowany klient TS.
- Auth: tabela userów, sesje/tokeny, middleware autoryzacji, proste RBAC (role na poziomie usera), reset hasła. Provider tożsamości email+hasło jako pierwsza implementacja interfejsu providera (sekcja 7).
- Abstrakcja mailera (implikowana przez reset hasła) z adapterem dev (mailhog) i produkcyjnym.
- CRUD scaffolder: generowanie modułu encji (schemat, migracja, endpointy, walidacje, widoki admina) na podstawie definicji Zod (sekcja 6).
- Panel administracyjny: własna implementacja na naszym design systemie, deployowalna osobno (np. subdomena); lista z paginacją/sortowaniem/filtrowaniem po kolumnach, formularze create/edit, widok szczegółów, usuwanie.
- Silnik formularzy headless + renderery na design systemie (sekcja 9).
- Pola audytowe (createdAt, updatedAt, createdBy) i soft delete jako konwencja w scaffolderze.
- Infrastruktura DX: walidowana konfiguracja env, structured logging (pino), globalna obsługa błędów z mapowaniem na odpowiedzi API, migracje i seedy, docker-compose (Postgres + mailhog), CI (GitHub Actions), testy unit (Vitest) i e2e (Playwright).
- Error tracking przez abstrakcję z adapterem Sentry (vendor wymienny).
- Dokumentacja AI: CLAUDE.md / AGENTS.md, przepisy, inwentarz komponentów DS (sekcja 11).

### Moduły opt-in (w repo lub dokumentowane jako przepis, włączane świadomie)

- Multi-tenancy (organizacje, zaproszenia, role per organizacja) — decyzja przy starcie projektu, bo dotyka schematu bazy i jest bolesna do doklejenia później.
- Upload plików z abstrakcją storage.
- Save & resume dla wizardów (persystencja częściowego stanu formularza).
- OpenTelemetry (tracing).
- Kolejki / background jobs.

### Jawnie poza zakresem

- Płatności, i18n, feature flagi, pełnotekstowe wyszukiwanie, social login (implementowane w projektach jako kolejne providery tożsamości), SSR w domyślnej skorupie FE.

## 3. Struktura monorepo

```
apps/
  api        — Fastify, moduły domenowe, montowanie z rejestru
  web        — domyślna skorupa: Vite + React + TanStack Router
  admin      — panel administracyjny, osobno deployowalny (subdomena)
packages/
  schemas    — schematy Zod encji i formularzy; czysty TS, zero zależności
  api-client — klient generowany z OpenAPI; framework-agnostic (fetch)
  api-react  — bindingi TanStack Query nad klientem (hooki per zasób)
  forms      — headless silnik formularzy (stan, walidacja, kroki, zależności)
  forms-ui   — renderery pól spięte z design systemem
  ui         — kompozycje na DS: DataTable, layout admina, EmptyState itd.
  config     — współdzielone ESLint / Prettier / tsconfig
design-system/  — nasz DS jako git subtree (sekcja 10)
```

Konsekwencje osobnego `apps/admin` na subdomenie, obsłużone od pierwszego dnia: cookies z domeną nadrzędną lub tokeny, CORS pod dwa originy, wspólne `packages/ui` i `packages/api-client`, żeby web i admin nie dywergowały w podstawach.

## 4. Wymienialność silnika FE

Wartość bootstrapu na froncie żyje w `packages/`, a `apps/web` jest cienką skorupą (routing, layout, składanie klocków). Projekt potrzebujący SSR stawia własną skorupę (np. Next) i importuje te same pakiety — wymianie podlega skorupa, nie inwestycja.

Granica pilnowana w review: **React tak, router i bundler-specyfika nie.** W `packages/` zakazane są importy z routera (np. `@tanstack/react-router`) i bundlerowe API (np. `import.meta.env` — env przekazywany jawnie przez inicjalizację). TanStack Query jest dozwolony (działa identycznie w każdej skorupie). Nie dążymy do agnostyczności względem Reacta — React jest bezpiecznym założeniem, pełna agnostyczność podwoiłaby koszt bez realnego zysku.

`apps/admin` jako druga skorupa na tych samych pakietach działa jak permanentny test tej granicy — przecieki specyfiki wychodzą natychmiast.

## 5. Stack

| Warstwa | Wybór | Uzasadnienie (jedno zdanie) |
|---|---|---|
| Runtime | Node 22 LTS, pnpm workspaces, Turborepo | Nudne i przewidywalne; ekosystem wygrywa z nowinkami. |
| Język | TypeScript strict wszędzie | Wspólne configi w `packages/config`. |
| Baza | PostgreSQL | Bez dyskusji. |
| ORM | Drizzle | Schemat jako kod TS — łatwiejszy do generowania i transformowania przez scaffolder i agentów niż osobny DSL. |
| BE | Fastify + Zod (`fastify-type-provider-zod`) | Zod domyka łańcuch jednego źródła prawdy: walidacja req/res, typy, OpenAPI, walidacja FE, definicje formularzy; struktura modułowa to nasza cienka konwencja zamiast ciężkiej maszynerii frameworka. |
| API | REST + OpenAPI (`zod-openapi`) + generowany klient TS | Uniwersalność dla przyszłych konsumentów spoza TS; type-safety odzyskana przez generowanego klienta. |
| FE (domyślna skorupa) | Vite + React + TanStack Router + TanStack Query | Jeden świat wykonania (bez SSR), szybki dev, czytelne dla agentów. |
| UI | Nasz design system (git subtree) + `packages/ui` | Kompozycje budowane *na* DS, nie obok niego. |
| Testy | Vitest (unit) + Playwright (e2e) | — |
| Dev env | docker-compose: Postgres + mailhog | — |
| Logging | pino (structured) | — |
| Error tracking | abstrakcja + adapter Sentry | Vendor wymienny. |
| CI | GitHub Actions | — |

## 6. Scaffolder i jego kontrakt

Zadanie „dodaj encję" generuje kompletny moduł: schemat Zod z metadanymi → schemat Drizzle + migracja → endpointy CRUD z walidacją → wpisy w spec OpenAPI → widoki admina (lista, formularz, detal).

Wpływ na istniejące pliki jest zminimalizowany przez **registry pattern**: menu admina, routing i montowanie routerów BE renderują się z rejestrów encji/modułów, więc generator dopisuje jedną rejestrację (linię w pliku-indeksie lub plik w konwencjonalnym katalogu zbieranym automatycznie). Tam, gdzie naprawdę trzeba wstrzyknąć kod w środek pliku, używamy komentarzy-kotwic (`// scaffolder:entities — do not remove`). Świadomie rezygnujemy z parsowania AST i inteligentnego mergowania — konwencja + kotwice pokrywają zdecydowaną większość przypadków, reszta jest opisana w przepisach i wykonywalna przez agenta ręcznie.

Zakres CRUD: relacje 1:N — tak; M:N z atrybutami na tabeli pośredniej — poza generatorem (przepis ręczny); soft delete i pola audytowe — domyślnie; upload plików — moduł opt-in; pełnotekstowe wyszukiwanie — poza zakresem (filtrowanie po kolumnach wystarcza).

Wygenerowany kod jest jednocześnie **referencyjnym użyciem design systemu i konwencji** — uczy wzorców każdego, kto go czyta, człowieka i agenta. To podnosi wymaganą jakość szablonów.

## 7. Auth

Core zawiera: tabelę userów, sesje/tokeny (z refreshem), middleware autoryzacji, proste RBAC, reset hasła (→ mailer). Modularna jest **metoda logowania**: granica przebiega przez interfejs providera tożsamości, nie przez cały auth. Email+hasło to pierwsza implementacja tego interfejsu w core; social login i inni providerzy to kolejne implementacje dokładane w projektach. Auth nie może być opcjonalny w schemacie — CRUD admin i `createdBy` na nim wiszą.

Auth od startu wspiera admin na subdomenie (cookies `.domena` lub tokeny, CORS na dwa originy).

## 8. Konwencje API

- Format błędów oparty na RFC 7807 (problem+json), spójny z globalnym handlerem błędów.
- Paginacja: offset-based w core (prostsza, wystarczająca dla admina); cursor-based jako przepis dla publicznych list.
- Wersjonowanie: `/api/v1` jako konwencja ścieżki, bez dodatkowej maszynerii.
- Spec OpenAPI generowany ze schematów Zod — nigdy pisany ręcznie; z niego dokumentacja i klient.

## 9. Silnik formularzy

Formularz = **definicja** (pola + walidacje per pole + walidacje międzypolowe + zależności/warunkowa widoczność + kroki wizarda) + **handler submitu** będący dowolną funkcją. Formularz CRUD to szczególny przypadek: definicja wywiedziona ze schematu encji, handler zapisujący do bazy. Wizard zbierający dane do zewnętrznego API używa tego samego silnika z innym handlerem — dane z formularza mogą, ale nie muszą trafiać do bazy.

Silnik (`packages/forms`) jest headless — logika i kontrakt bez komponentów. Renderery (`packages/forms-ui`) mapują typy pól na komponenty design systemu; mapping „typ pola → komponent DS" jest jawny i udokumentowany. Save & resume dla wizardów to moduł opt-in (ciągnie persystencję stanu częściowego).

## 10. Design system

Dystrybucja: **git subtree** w repo. Konsekwencje: kod DS jest fizycznie w repozytorium (agent czyta źródła zamiast zgadywać API; zero konfiguracji prywatnego registry w CI); aktualizacja przez `git subtree pull` opisana jako przepis.

Reguła twarda, zapisana w plikach dla agentów: **katalog DS jest read-only w projekcie.** Zmiany idą upstream do repo DS albo przez warstwę `packages/ui`. Bez tej reguły lokalne „naprawianie" komponentów po cichu tworzy forka.

Wymagane pokrycie komponentowe (słownik dla generatorów; braki dorabiane w DS przed pisaniem szablonów scaffoldera): input, textarea, select, combobox z async search (pola relacji), checkbox, radio, switch, date picker, tabela lub prymitywy tabeli, modal/dialog, toast, pagination, tabs/stepper (wizardy), skeleton/spinner.

## 11. AI-kompatybilność

- `CLAUDE.md` / `AGENTS.md` w rootcie: architektura, komendy, konwencje, granice (np. „DS read-only", „w packages/ bez routera i import.meta.env").
- Krótkie README per moduł tam, gdzie moduł ma nieoczywiste reguły.
- **Przepisy** („jak dodać encję krok po kroku", „jak dodać providera tożsamości", „jak zaktualizować DS") — jeden dokument będący równocześnie dokumentacją dla człowieka, instrukcją dla agenta i specyfikacją scaffoldera; skoro opisują ten sam proces, nie rozjadą się. Część przepisów może być wydana jako komendy/skille dla agentów.
- Inwentarz komponentów DS z przykładami użycia — żeby agenty nie halucynowały API i nie przemycały gołego HTML obok DS.
- Dokumentacja traktowana jak kod: aktualizowana w tych samych PR-ach, które zmieniają konwencje; pozycja w szablonie PR (docelowo check w CI). Nieaktualny plik dla agenta jest gorszy niż żaden.

## 12. Pętla aktualizacji: changelog jako przepisy

Projekty są odcięte po starcie — nie ma mergowania upstreamu, wersjonowanych pakietów frameworka ani narzędzi do synchronizacji. Zamiast tego **pętla przez instrukcje, nie przez kod**:

- Bootstrap prowadzi `CHANGELOG.md`, w którym wpisy są przepisami migracyjnymi pisanymi pod agenta: co naprawiono, dlaczego, jak znaleźć odpowiedni fragment w projekcie i czym go zastąpić.
- Projekt aplikuje poprawkę przez podanie wpisu agentowi (lub komendę „sprawdź changelog bootstrapu od daty startu i zaaplikuj co dotyczy"). Agent aplikuje zmianę na zdywergowany kod, bo rozumie intencję, nie diff — konflikty przestają istnieć jako problem.
- Plik `BOOTSTRAP_VERSION` (data/hash) wstemplowany przy starcie projektu wyznacza, od którego wpisu czytać.
- Koszt po stronie bootstrapu: sekcja „wpis changeloga" w szablonie PR. Główny zysk: kanał na poprawki bezpieczeństwa (dziura w auth bootstrapu jest dziurą we wszystkich projektach) oraz na błędy w kodzie generowanym przez scaffolder.

## 13. Kwestie otwarte

- Weryfikacja pokrycia komponentowego DS względem listy z sekcji 10 (w toku; DS zostanie doprowadzony do wymaganego stanu).
- Format metadanych encji rozszerzających schemat Zod (etykiety, widoczność kolumn, typy pól formularza) — do zaprojektowania przy implementacji scaffoldera.
- Docelowy mechanizm checku CI pilnującego aktualności dokumentacji AI.
