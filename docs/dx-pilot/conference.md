# Pilot DX — „Conference" (system obsługi konferencji)

Specyfikacja **przykładowego projektu**, budowanego ręcznie na bootstrapie w celu zmierzenia DX.
To nie jest część bootstrapa — cały kod projektowy zostanie wycofany po zakończeniu pilota,
a w `main` wylądują wyłącznie poprawki silnika, które ten pilot wymusi.

> Dokument opisuje **co** ma powstać, nie **jak**. Implementacja to zadanie dewelopera; sposób
> wynika z przepisów w `docs/recipes/` i konwencji z `CLAUDE.md`. Jeśli w którymś miejscu przepis
> nie wystarcza — to jest właśnie znalezisko, po które ten pilot został uruchomiony.

---

## 1. Zasady pracy

### Podział ról

| Kto                        | Zakres                                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deweloper (użytkownik)** | Pisze cały kod projektu: encje, moduły API, widoki, testy. Korzysta z przepisów i scaffoldera. Zgłasza każde miejsce, gdzie utknął, musiał zgadywać albo obejść silnik. |
| **Agent**                  | Nie dotyka kodu projektowego. Naprawia wyłącznie silnik: scaffolder, `packages/*`, `apps/api` (rdzeń), konwencje, przepisy, dokumentację.                               |

### Jak zgłaszać problem

Cztery zdania wystarczą — im wcześniej, tym lepiej (nie walcz z tym samodzielnie dłużej niż ~15 minut,
bo mierzymy właśnie to, gdzie i jak długo się grzęźnie):

1. **Co robiłem** — etap i konkretny krok.
2. **Czego oczekiwałem** — jak myślałem, że to zadziała.
3. **Co się stało** — komunikat błędu / brak reakcji / dziwny wygenerowany kod.
4. **Gdzie szukałem** — który przepis / plik / sekcja `CLAUDE.md` i czego tam zabrakło.

Punkt 4 jest najważniejszy: jeśli odpowiedź była w dokumentacji, ale jej nie znalazłeś, to nadal jest
problem silnika — do poprawy nawigacji, a nie kodu.

### Rozdział warstw w gicie

Wszystko na branchu `dx-test`. Rozdzielenie idzie przez **scope commita**:

- `demo(conf): …` — kod projektowy (encje konferencji, moduły API, widoki, seed, e2e demo).
- `feat(scope): …` / `fix(scope): …` — poprawki silnika (normalne konwencje z `CLAUDE.md`).

Kod demo w wydzielonych ścieżkach, żeby końcowe wycofanie było mechaniczne:

```
packages/schemas/src/conf/            # encje konferencji
apps/api/src/modules/<plural>/        # moduły generowane scaffolderem (venues, rooms, events, …)
apps/api/src/modules/public/          # publiczne (anonimowe) trasy — jeśli powstaną
apps/admin/src/entities/              # widoki admina (generowane)
apps/web/src/conf/                    # publiczny front konferencji
docs/dx-pilot/                        # ten dokument
```

Na końcu pilota: `git log --grep "^demo("` daje pełną listę do rewertu, reszta idzie do `main`.

### Encje referencyjne — decyzja przy starcie

`project` / `task` / `comment` to encje referencyjne bootstrapa. Dwa warianty:

- **Zostawiamy obok** (domyślny) — szybszy start, admin ma więcej pozycji w menu, ale nie sprawdzamy
  wykonalności czyszczenia.
- **Usuwamy jako krok 0** — realny pierwszy ruch każdego forka („fork & forget") i osobna sonda DX:
  czy da się je usunąć bez rozsypania kotwic scaffoldera, testów, e2e i migracji. Ryzyko: pierwsza
  tura zejdzie na grzebanie w silniku zamiast w projekcie.

---

## 2. Domena w pigułce

Organizator prowadzi konferencje. Definiuje **obiekt** (`Venue`) i jego **sale** (`Room`), tworzy
**wydarzenie** (`Event`) z terminem i limitem miejsc, układa **agendę** z **prelekcji** (`Talk`)
przypisanych do sal, obsadza je **prelegentami** (`Speaker`) w rolach (`TalkSpeaker`), publikuje
wydarzenie i zbiera **rejestracje** uczestników (`Registration`) przez stronę publiczną.

Dwie skorupy:

- **`apps/admin`** — panel organizatora (za logowaniem, RBAC).
- **`apps/web`** — publiczna strona wydarzenia: agenda i formularz rejestracji, **bez logowania**.

---

## 3. Encje

Konwencje obowiązujące wszystkie encje (z `CLAUDE.md`):

- Pola audytowe (`id`, `createdAt`, `updatedAt`, `createdBy`) i soft delete (`deletedAt`) dokłada
  silnik — **nie deklaruj ich w schemacie** (scaffolder odrzuci encję z czytelnym błędem).
- Etykiety (`label`, `labelPlural`) po angielsku.
- Pola deklaruj **builderami `f.*`** (`f.text().min(1).sortable()`, `f.select({ draft: "Draft" })`,
  `f.relation("venue", "name").optional()`) — tabela kontrolek i metod w `packages/schemas/README.md`.
  Kolumny „Zod" i „control" w tabelach poniżej opisują **intencję**; builder dobiera typ Zod sam,
  więc nie ma czego parować ręcznie. Etykieta pominięta w `.label()` wywodzi się z nazwy pola.
- Walidacja międzypolowa przez `refine` w `defineEntity`; reguły wymagające odczytu z bazy
  **nie należą do Zoda** — idą do service'u.

> **Uwaga na nazwę.** Encja prelekcji nazywa się `talk`, a nie `session`, bo tabela `sessions` jest
> już zajęta przez rdzeń auth (sesje odświeżania). To świadome obejście — zgłoś, jeśli scaffolder
> nie ostrzega przed kolizją nazwy tabeli (patrz sekcja 5).

### 3.1 `Venue` — obiekt konferencyjny

`name: venue` · `plural: venues` · `label: Venue / Venues` · `displayField: name`

| Pole      | Zod                             | control    | Wymagane | `list`                   |
| --------- | ------------------------------- | ---------- | -------- | ------------------------ |
| `name`    | `z.string().min(1).max(120)`    | `text`     | tak      | `sortable`, `filterable` |
| `city`    | `z.string().min(1).max(80)`     | `text`     | tak      | `filterable`             |
| `address` | `z.string().max(500).nullish()` | `textarea` | nie      | `visible: false`         |

Najprostszy przypadek — rozgrzewka i cel relacji dla `Room` i `Event`.

### 3.2 `Room` — sala

`name: room` · `plural: rooms` · `label: Room / Rooms` · `displayField: name`

| Pole           | Zod                                 | control                   | Wymagane | `list`       |
| -------------- | ----------------------------------- | ------------------------- | -------- | ------------ |
| `name`         | `z.string().min(1).max(80)`         | `text`                    | tak      | `sortable`   |
| `capacity`     | `z.number().int().min(1).max(5000)` | `number`                  | tak      | `sortable`   |
| `hasProjector` | `z.boolean()`                       | `checkbox`                | tak      | —            |
| `venueId`      | `z.string().uuid()`                 | `relation` → `venue.name` | tak      | `filterable` |

### 3.3 `Event` — wydarzenie

`name: event` · `plural: events` · `label: Event / Events` · `displayField: name`

| Pole          | Zod                                                           | control                   | Wymagane | `list`                   | Uwagi                                          |
| ------------- | ------------------------------------------------------------- | ------------------------- | -------- | ------------------------ | ---------------------------------------------- |
| `name`        | `z.string().min(1).max(200)`                                  | `text`                    | tak      | `sortable`, `filterable` |                                                |
| `slug`        | `z.string().min(3).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)` | `text`                    | tak      | `filterable`             | **unikalny globalnie**, publiczny URL          |
| `description` | `z.string().max(4000).nullish()`                              | `textarea`                | nie      | `visible: false`         | wymagany przy publikacji (reguła domenowa)     |
| `startsAt`    | `z.coerce.date()`                                             | `date`                    | tak      | `sortable`               | **z godziną**                                  |
| `endsAt`      | `z.coerce.date()`                                             | `date`                    | tak      | `sortable`               | **z godziną**                                  |
| `status`      | `z.enum(["draft","published","cancelled"])`                   | `select`                  | tak      | `filterable`             | zmieniany **wyłącznie** procesem P2            |
| `isPublic`    | `z.boolean()`                                                 | `switch`                  | tak      | `filterable`             | `published` + `isPublic` = widoczne publicznie |
| `capacity`    | `z.number().int().min(1).max(100000)`                         | `number`                  | tak      | —                        | twardy limit rejestracji                       |
| `venueId`     | `z.string().uuid().nullish()`                                 | `relation` → `venue.name` | nie      | `filterable`             | wymagany dopiero przy publikacji               |

`refine`: `endsAt > startsAt`.

### 3.4 `Speaker` — prelegent

`name: speaker` · `plural: speakers` · `label: Speaker / Speakers` · `displayField: fullName`

| Pole          | Zod                              | control    | Wymagane | `list`                   |
| ------------- | -------------------------------- | ---------- | -------- | ------------------------ |
| `fullName`    | `z.string().min(1).max(120)`     | `text`     | tak      | `sortable`, `filterable` |
| `email`       | `z.string().email()`             | `text`     | tak      | `filterable`             |
| `bio`         | `z.string().max(2000).nullish()` | `textarea` | nie      | `visible: false`         |
| `company`     | `z.string().max(120).nullish()`  | `text`     | nie      | `filterable`             |
| `website`     | `z.string().url().nullish()`     | `text`     | nie      | `visible: false`         |
| `isConfirmed` | `z.boolean()`                    | `switch`   | tak      | `filterable`             |

Encja celowo ma pola z walidacją formatu (`email`, `url`) przy kontrolce `text` — sprawdzamy,
czy brak dedykowanych kontrolek boli w praktyce.

### 3.5 `Talk` — prelekcja

`name: talk` · `plural: talks` · `label: Talk / Talks` · `displayField: title`

| Pole         | Zod                                                     | control                   | Wymagane | `list`                   |
| ------------ | ------------------------------------------------------- | ------------------------- | -------- | ------------------------ |
| `title`      | `z.string().min(1).max(200)`                            | `text`                    | tak      | `sortable`, `filterable` |
| `abstract`   | `z.string().max(4000).nullish()`                        | `textarea`                | nie      | `visible: false`         |
| `track`      | `z.enum(["product","engineering","design","business"])` | `select`                  | tak      | `filterable`             |
| `level`      | `z.enum(["intro","intermediate","advanced"])`           | `radio`                   | tak      | `filterable`             |
| `startsAt`   | `z.coerce.date()`                                       | `date`                    | tak      | `sortable`               |
| `endsAt`     | `z.coerce.date()`                                       | `date`                    | tak      | —                        |
| `isRecorded` | `z.boolean()`                                           | `checkbox`                | tak      | —                        |
| `eventId`    | `z.string().uuid()`                                     | `relation` → `event.name` | tak      | `filterable`             |
| `roomId`     | `z.string().uuid()`                                     | `relation` → `room.name`  | tak      | `filterable`             |

`refine`: `endsAt > startsAt`.

Reguły **nie** do Zoda (wymagają odczytu z bazy — service):

- prelekcja mieści się w oknie czasowym swojego wydarzenia,
- sala nie ma dwóch prelekcji nachodzących na siebie czasowo,
- sala należy do obiektu, w którym odbywa się wydarzenie.

### 3.6 `Registration` — zgłoszenie uczestnika

`name: registration` · `plural: registrations` · `label: Registration / Registrations` ·
`displayField: email`

| Pole            | Zod                                           | control                   | Wymagane | `list`           | Uwagi                                                        |
| --------------- | --------------------------------------------- | ------------------------- | -------- | ---------------- | ------------------------------------------------------------ |
| `eventId`       | `z.string().uuid()`                           | `relation` → `event.name` | tak      | `filterable`     |                                                              |
| `fullName`      | `z.string().min(1).max(120)`                  | `text`                    | tak      | `sortable`       |                                                              |
| `email`         | `z.string().email()`                          | `text`                    | tak      | `filterable`     | **unikalny w obrębie wydarzenia**                            |
| `ticketType`    | `z.enum(["standard","student","speaker"])`    | `select`                  | tak      | `filterable`     |                                                              |
| `needsCatering` | `z.boolean()`                                 | `checkbox`                | tak      | —                |                                                              |
| `acceptsTerms`  | `z.boolean()`                                 | `checkbox`                | tak      | `visible: false` | musi być `true`                                              |
| `status`        | `z.enum(["pending","confirmed","cancelled"])` | `select`                  | tak      | `filterable`     | ustawiany **serwerowo**, publiczny formularz go nie przysyła |

`refine`: `acceptsTerms === true`.

Reguły w service: limit miejsc (`event.capacity`) sprawdzany **w transakcji**, unikalność e-maila
w obrębie wydarzenia, rejestracja tylko na wydarzenie `published`.

### 3.7 `TalkSpeaker` — obsada prelekcji (M:N z atrybutami)

**Scaffoldowalna jak każda inna encja** — tabela łącząca z własnymi polami to zwykła encja z dwiema
relacjami. Generator daje warstwę danych, CRUD, hooki i widoki; ręcznie dokładasz tylko UX przypisania.

`name: talkSpeaker` · `plural: talkSpeakers` · `label: Talk speaker / Talk speakers` ·
`displayField: role`

| Pole         | Zod                                          | control                         | Wymagane | `list`       |
| ------------ | -------------------------------------------- | ------------------------------- | -------- | ------------ |
| `talkId`     | `z.string().uuid()`                          | `relation` → `talk.title`       | tak      | `filterable` |
| `speakerId`  | `z.string().uuid()`                          | `relation` → `speaker.fullName` | tak      | `filterable` |
| `role`       | `z.enum(["speaker","moderator","panelist"])` | `select`                        | tak      | —            |
| `orderIndex` | `z.number().int().nonnegative()`             | `number`                        | tak      | `sortable`   |

Unikalność pary: `unique: [["talkId", "speakerId"]]` na encji.

**Czego generator nie zrobi** (dokładasz ręcznie, jeśli chcesz kształtu z P7): zagnieżdżonych tras
`GET|POST /talks/:id/speakers` — z generatora wychodzi `GET /api/v1/talk-speakers?talkId=…` — oraz
widgetu obsady na detalu prelekcji, bo w adminie pojawia się osobna pozycja menu z własnym CRUD-em.

### Pokrycie kontrolek

`text` · `textarea` · `number` · `select` · `radio` · `checkbox` · `switch` · `date` · `relation` —
**komplet 9/9**. Jeśli któraś kontrolka nie ma sensownego renderu albo gubi dane, wyjdzie to tutaj.

---

## 4. Procesy

Każdy proces: **cel → aktor → przebieg → endpointy → reguły → kryterium „gotowe"**.

### P1. Wizard „utwórz wydarzenie"

**Cel:** organizator zakłada wydarzenie w jednym przejściu, razem z agendą i zaproszeniami.
**Aktor:** `admin` / `organizer` (admin).

**Przebieg — 3 kroki:**

1. **Dane wydarzenia** — `name`, `slug`, `description`, `startsAt`, `endsAt`, `capacity`, `venueId`.
   → zapis `Event` ze statusem `draft`.
2. **Agenda** — lista prelekcji dodawanych wierszami (tytuł, ścieżka, poziom, sala, godziny).
   → zapis wielu `Talk` naraz.
3. **Zaproszenia prelegentów** — lista adresów e-mail. → **wysyłka maili, bez zapisu encji.**

`onComplete` orkiestruje trzy handlery. Budujesz przez `<Wizard>` z `packages/forms-ui`, wg
`docs/recipes/how-to-define-a-form.md`.

**Endpointy:** `POST /api/v1/events` · `POST /api/v1/events/:id/talks` (hurt) ·
`POST /api/v1/events/:id/invitations`.

**Reguły:** kroku 2 i 3 nie da się wykonać bez `id` z kroku 1; przerwanie wizarda zostawia
wydarzenie w `draft` (save & resume jest opt-in i **poza zakresem** pilota).

**Gotowe, gdy:** wizard przechodzi end-to-end, w mailhogu widać zaproszenia, wydarzenie i prelekcje
są w bazie. **Sonda DX:** czy dało się to zbudować z samego przepisu, bez czytania referencyjnego
`apps/admin/src/entities/project-wizard.tsx`.

### P2. Publikacja i odwołanie wydarzenia

**Cel:** kontrolowane przejście stanu, nie zwykły PATCH pola.
**Aktor:** `admin` / `organizer`.

**Przebieg:** `draft → published` (walidacja domenowa) oraz `published → cancelled`
(+ mail do wszystkich zarejestrowanych).

**Endpointy:** `POST /api/v1/events/:id/publish` · `POST /api/v1/events/:id/cancel`.

**Reguły publikacji** (service, nie Zod): `venueId` ustawione · `description` niepuste ·
co najmniej 1 prelekcja · `startsAt` w przyszłości · brak kolizji sal w agendzie.
Odmowa = błąd RFC 7807 z listą niespełnionych warunków.

**Gotowe, gdy:** `status` nie da się zmienić zwykłym `PATCH /events/:id`, a odwołanie wysyła maile.
**Sonda DX:** gdzie w konwencji ląduje przejście stanu i czy scaffolder nie wymusza wystawienia
`status` jako edytowalnego pola.

### P3. Publiczna agenda (bez logowania)

**Cel:** strona wydarzenia dostępna dla każdego.
**Aktor:** anonim, `apps/web`.

**Trasy:**

- `/` — lista wydarzeń `published` + `isPublic`.
- `/e/$slug` — detal: opis, termin, obiekt, agenda pogrupowana po dniach i salach.
- `/e/$slug/talk/$id` — detal prelekcji z listą prelegentów i ich rolami.

**Endpointy:** publiczne, tylko odczyt — `GET /api/v1/public/events` ·
`GET /api/v1/public/events/:slug` · `GET /api/v1/public/events/:slug/agenda`.

**Reguły:** drafty i odwołane niedostępne (404, nie 403 — nie zdradzamy istnienia) · odpowiedź
publiczna **nie zawiera** pól audytowych ani `createdBy` · każdy widok obsługuje loading / error /
empty / success · a11y: nawigacja klawiaturą, sensowne nagłówki, `lang`.

**Gotowe, gdy:** wylogowana przeglądarka widzi agendę, a `curl` na draft zwraca 404.
**Sonda DX:** ile pracy kosztuje wystawienie _czegokolwiek_ publicznie (patrz sekcja 5).

### P4. Rejestracja uczestnika

**Cel:** anonimowy zapis na wydarzenie z potwierdzeniem mailowym.
**Aktor:** anonim, `apps/web`.

**Przebieg:** formularz na `/e/$slug/register` (zbudowany z `entity.fields` + `entity.validation`) →
zapis `status: pending` → mail z linkiem potwierdzającym → wejście w link ustawia `confirmed`.

**Endpointy:** `POST /api/v1/public/events/:slug/registrations` ·
`GET /api/v1/public/registrations/confirm?token=…`.

**Reguły:** `acceptsTerms === true` (Zod) · e-mail unikalny w obrębie wydarzenia (service) ·
limit `capacity` liczony po `pending` + `confirmed`, sprawdzany **w transakcji** · rejestracja tylko
na `published` · token potwierdzenia trzymany **wyłącznie jako hash** (jak sesje w rdzeniu auth) ·
`status` i `createdBy` nie pochodzą z body.

**Poza zakresem (odnotuj, nie implementuj):** rate limiting, captcha, podwójna rejestracja przy
race condition ponad transakcję.

**Gotowe, gdy:** dwie rejestracje na ten sam e-mail dają 409, przekroczenie limitu daje czytelny
błąd, a w mailhogu ląduje potwierdzenie z działającym linkiem.

### P5. Panel organizatora

**Cel:** obsługa wydarzenia od środka.
**Aktor:** `admin` / `organizer`.

**Zakres:** 6 encji w rejestrze admina (`venue`, `room`, `event`, `speaker`, `talk`, `registration`) ·
lista rejestracji z filtrem po wydarzeniu i statusie, sortem po dacie i paginacją · detal wydarzenia
pokazujący licznik `zarejestrowani / capacity` · akcje publikacji i odwołania (P2).

**Gotowe, gdy:** wygenerowane widoki działają bez ręcznych poprawek, a te, które ich wymagały, są
zgłoszone.

### P6. Role i dostęp

**Cel:** sprawdzić, czy RBAC bootstrapa wystarcza realnemu projektowi.

Role do dodania w `apps/api/src/modules/auth/rbac.ts` (`APP_ROLES` — jedno źródło prawdy;
dziś `["admin", "user"]`):

| Rola        | Uprawnienia                                                               |
| ----------- | ------------------------------------------------------------------------- |
| `admin`     | wszystko, w tym `Venue` / `Room` / użytkownicy                            |
| `organizer` | pełne CRUD na wydarzeniach, prelekcjach, prelegentach, odczyt rejestracji |
| `viewer`    | tylko odczyt w panelu                                                     |

**Gotowe, gdy:** `viewer` dostaje 403 na zapisie, `organizer` na zarządzaniu użytkownikami.
**Sonda DX:** zapisz, czego brakuje, gdy chcesz „organizator widzi wyłącznie **swoje** wydarzenia" —
silnik zna dziś tylko role, nie własność rekordu. **Nie implementuj obejścia**, tylko zgłoś.

### P7. Obsada prelekcji (M:N z atrybutami)

**Cel:** przypisanie prelegentów do prelekcji z rolą i kolejnością — jedyna rzecz jawnie wyłączona
z zakresu scaffoldera.

**Przebieg:** na detalu prelekcji w adminie lista prelegentów + dodanie (wybór prelegenta, rola,
kolejność) i usunięcie.

**Endpointy:** `GET|POST /api/v1/talks/:id/speakers` · `DELETE /api/v1/talks/:id/speakers/:speakerId`.

**Reguły:** para (`talkId`, `speakerId`) unikalna · usunięcie prelekcji kaskaduje na obsadę ·
prelegenta z obsadą nie da się usunąć (`restrict`).

**Gotowe, gdy:** publiczny detal prelekcji (P3) pokazuje obsadę w kolejności `orderIndex`.
**Sonda DX:** czy `docs/recipes/how-to-add-an-entity.md` prowadzi przez ten przypadek, czy trzeba
odtwarzać wzorzec z wygenerowanego kodu.

### P8. Zmiana łamiąca w połowie projektu

**Cel:** przejść cykl **expand → migrate → contract** na żywym kodzie z konsumentami po obu stronach.

**Scenariusz:** `Speaker.fullName` → `firstName` + `lastName`.

1. **Expand** — dodaj `firstName` / `lastName` jako opcjonalne, `fullName` zostaje. API przyjmuje
   oba warianty, klient i widoki dalej działają.
2. **Migrate** — migracja danych rozbijająca istniejące `fullName`; backfill idempotentny.
   Konsumenci (admin, publiczny front, `packages/api-client`) przechodzą na nowe pola.
3. **Contract** — `fullName` usunięte, nowe pola wymagane.

**Gotowe, gdy:** na każdym etapie `pnpm build` i testy są zielone, a aplikacja działa — bez „wielkiego
skoku". **Sonda DX:** czy `docs/recipes/how-to-add-a-migration.md` opisuje ten cykl na tyle konkretnie,
by dało się go wykonać bez wymyślania procedury od zera.

### P9. Wolumen i listy

**Cel:** sprawdzić listy na danych, których nie da się objąć wzrokiem.

**Seed (idempotentny, rozszerzenie `apps/api/src/db/seed.ts`):** 2 obiekty · 8 sal · 3 wydarzenia
(1 `draft`, 1 `published`, 1 `cancelled`) · 8 prelegentów · ~12 prelekcji · **600 rejestracji**
rozłożonych po statusach.

**Gotowe, gdy:** lista rejestracji z filtrem i sortem działa w akceptowalnym czasie, paginacja się
nie rozjeżdża. **Sonda DX:** czy offset wystarcza, czy sięgasz po `docs/recipes/cursor-based-pagination.md`
— i czy ten przepis daje się zastosować.

### P10. E2E i Docker

**E2E (Playwright, `e2e/tests/`):**

- ścieżka publiczna: agenda → rejestracja → potwierdzenie w mailhogu,
- ścieżka organizatora: wizard → publikacja → widok rejestracji.

**Docker:** `pnpm docker:full` + seed — demo musi działać w wariancie prod-like, nie tylko w `pnpm dev`.

**Gotowe, gdy:** oba scenariusze przechodzą lokalnie i w kontenerach.

---

## 5. Przewidywane zderzenia z silnikiem

Hipotezy zweryfikowane w kodzie, **celowo nienaprawione z góry** — wartością pilota jest sprawdzenie,
czy realnie bolą i jak bardzo. Traktuj tę listę jak ściągę: jeśli trafiasz na coś z niej, zgłoś
i nie trać czasu na obejście.

| #   | Zderzenie                                                                                                                                                | Stan w kodzie                                                                                                                         | Gdzie uderzy                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | **Brak ścieżki publicznej** — każdy generowany endpoint ma `preHandler: [app.authenticate]`                                                              | `tools/scaffold/src/be-templates.ts:475-523`, tak samo encje referencyjne (`apps/api/src/modules/projects/projects.routes.ts:28-101`) | P3, P4 — nie zadziałają bez zmiany w silniku   |
| 2   | ~~**`date` gubi godzinę**~~ — **NAPRAWIONE**: doszła kontrolka `datetime` (`f.datetime()` → `input[type=datetime-local]`, ta sama kolumna `timestamptz`) | `packages/schemas/src/lib/field-builder.ts`, `packages/forms-ui/src/field-renderer.tsx`                                               | P1, P3 — agenda z godzinami                    |
| 3   | ~~**Brak deklaracji unikalności**~~ — **NAPRAWIONE**: `.unique()` na polu, `unique: [[...]]` na encji → częściowy indeks + 409                           | `packages/schemas/src/lib/field-builder.ts`, `tools/scaffold/src/descriptor.ts` (ADR-0005)                                            | `Event.slug`, e-mail w obrębie wydarzenia (P4) |
| 4   | **Kolizja nazw tabel** — `session` zderza się z tabelą `sessions` rdzenia auth; scaffolder prawdopodobnie nie ostrzega                                   | obejście w tym spec: encja nazywa się `talk`                                                                                          | nazewnictwo encji, sekcja 3.5                  |
| 5   | **M:N z atrybutami** — warstwa danych i CRUD są scaffoldowalne; ręcznie zostaje UX przypisania (trasy zagnieżdżone, widget)                              | `tools/scaffold/README.md` (sekcja „Zasady i ograniczenia")                                                                           | P7 — sondą jest UX, nie schemat                |
| 9   | ~~**Encje wielowyrazowe**~~ — **NAPRAWIONE**: `plural` dawał jeden napis na cztery role, więc `talkSpeaker` psuł tabelę lub kod                          | `tools/scaffold/src/descriptor.ts` (formy `plural`/`table`/`path`/`file`, ADR-0005)                                                   | `TalkSpeaker` (3.7), każda encja wielowyrazowa |
| 6   | **Brak zapisu hurtowego**                                                                                                                                | brak wzorca w modułach referencyjnych                                                                                                 | P1 krok 2 (wiele prelekcji naraz)              |
| 7   | **Dostęp tylko po rolach** — brak wzorca na własność rekordu                                                                                             | `apps/api/src/modules/auth/rbac.ts` (`requireRoles`)                                                                                  | P6 — „organizator widzi swoje wydarzenia"      |
| 8   | **Brak kontrolek `email` / `url`** — walidację masz na builderze (`f.text().email()`), ale input renderuje się jako zwykły `text`                        | unia `FieldControl` w `define-entity.ts`, mapowanie w `packages/forms-ui/src/field-renderer.tsx`                                      | `Speaker` (3.4), formularz rejestracji         |

Lista jest otwarta — nowe znaleziska dopisujemy tutaj wraz z decyzją: **naprawiamy w silniku**,
**dokumentujemy jako świadome ograniczenie**, czy **zostawiamy jako opt-in**.

---

## 6. Kolejność pracy

Etapy są niezależnie zaliczalne — pilot można przerwać po każdym i nadal mieć wynik.

| Etap | Zakres                                                         | Sukces DX                                      | Problem DX                          |
| ---- | -------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| 0    | (opcjonalnie) usunięcie encji referencyjnych                   | usuwalne wg przepisu, build zielony            | trzeba szukać kotwic po omacku      |
| 1    | `Venue`, `Room` — encje + `pnpm scaffold` + migracja + klient  | wygenerowane działa bez ręcznych poprawek      | ręczna korekta wygenerowanego pliku |
| 2    | `Event`, `Speaker` — daty z godziną, `switch`, unikalny `slug` | godzina przechodzi przez formularz do bazy     | trzeba obejść kontrolkę `date`      |
| 3    | `Talk` — `radio`, dwie relacje, reguły czasowe w service       | wiadomo z konwencji, gdzie umieścić reguły     | zgadywanie warstwy                  |
| 4    | P1 — wizard „utwórz wydarzenie"                                | zbudowany z samego przepisu                    | trzeba czytać `project-wizard.tsx`  |
| 5    | P2 — publikacja / odwołanie + mailer                           | przejście stanu ma oczywiste miejsce           | walka ze scaffoldowanym CRUD-em     |
| 6    | P3 + P4 — publiczny front i rejestracja                        | wystawienie publicznego endpointu jest opisane | trzeba przerabiać rdzeń             |
| 7    | P7 — obsada prelekcji (M:N)                                    | przepis prowadzi za rękę                       | odtwarzanie wzorca z generatora     |
| 8    | P6 — role i dostęp                                             | `requireRoles` wystarcza                       | brak wzorca na własność rekordu     |
| 9    | P8 — zmiana łamiąca (expand → migrate → contract)              | przepis wystarcza                              | procedura wymyślana od zera         |
| 10   | P9 + P10 — wolumen, e2e, docker                                | wszystko zielone w kontenerach                 | konfiguracja walczy z demem         |

Po każdym etapie warto zapisać jedno zdanie: **ile to zajęło i co było najwolniejsze.** To jest
właściwy wynik pilota — lista poprawek silnika, która z niego wyjdzie, jest tylko produktem ubocznym.
