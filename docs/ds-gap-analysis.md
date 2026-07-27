# Specyfikacja komponentów DS potrzebnych w bootstrapie (silk — analiza luk)

Dokument do przekazania **zespołowi DS** (osobny tor prac). Zestawia **wszystkie** komponenty,
których wymaga bootstrap, z: statusem w silk, brakującymi funkcjami, wymaganym API i scenariuszami
użycia. Źródła wymagań: inwentarz sekcji 10 (`docs/ds-component-inventory.md`), metadane encji
(`packages/schemas` → `FieldControl`), `packages/ui` (DataTable/AdminLayout/EmptyState), widoki
admina (Faza 6) i silnik formularzy + wizard (Faza 7).

- **Analizowany DS:** `netguru/silk-storybook` (`@silk/components`), `main` @ `1d45f45` (2026-07-24).
- **Stack silk:** React 19 · Tailwind v4 · Radix UI · shadcn/ui · style-dictionary (tokeny) ·
  Phosphor icons · Storybook 10. Struktura atomic. Eksport **źródeł TS** (`main → src/index.ts`).
  Zbieżny z bootstrapem (React 19 + Tailwind v4) — brak konfliktu technologicznego.

**Legenda statusu:** ✅ gotowe (ew. mapowanie nazw) · ⚠️ jest, ale brak funkcji · ❌ brak.

**Podsumowanie luk:** ❌ Table/DataTable, Toast, Skeleton, Spinner, Stepper · ⚠️ Combobox
(brak async-search). Reszta pól i prymitywów pokryta. Szczegóły niżej.

---

## A. Pola formularza (metadane encji `FieldControl` + `forms-ui`, Faza 7)

Każde pole musi działać w trybie **kontrolowanym** (`value`/`onChange`), obsłużyć `disabled` i stan
**błędu walidacji** (spięcie z `FormItem`), oraz mieć dostępną etykietę (`id`/`aria`).

### A1. Input tekstowy — `control: "text"` → **`TextField`** ✅

- **Scenariusze:** pola `name`/`title` encji (create/edit), login (email/hasło), pole wyszukiwania w
  toolbarze listy.
- **Wymagane funkcje:** passthrough `<input>` (typy text/email/password/number), `disabled`,
  `placeholder`, kontrolowane `value`, rozmiary. silk: `TextField` = `Omit<ComponentProps<"input">>`
  - `size` + slot ikony/czyszczenia. **Spełnia.**
- **Braki:** brak — stan błędu obsługiwany przez `FormItem` (A10).

### A2. Liczba — `control: "number"` → **`TextField type="number"`** ✅ (⚠️ brak dedykowanego)

- **Scenariusze:** pole `estimate` (Task), dowolne pola liczbowe encji.
- **Wymagane funkcje:** wprowadzanie liczb, min/max/step, kontrolowane. Pokrywa `TextField`
  z `type="number"`. Istnieje też `quantity-selector` (stepper +/−) — to **inny** przypadek
  (ilości), nie ogólne pole liczbowe.
- **Braki:** brak twardego (opcjonalnie: dedykowany `NumberField` z formatowaniem — nice-to-have).

### A3. Textarea — `control: "textarea"` → **`Textarea`** ✅

- **Scenariusze:** pola `description` encji.
- **Wymagane funkcje:** passthrough `<textarea>`, `rows`, `disabled`, kontrolowane, błąd przez
  `FormItem`. **Spełnia.**

### A4. Select / enum — `control: "select"` → **`Select`** ✅ (single)

- **Scenariusze:** pola enum (`status`, `priority`), filtry kolumn w toolbarze listy.
- **Wymagane funkcje:** wybór jednej wartości z listy, `placeholder`, `defaultValue`/kontrolowane,
  `disabled`. silk: Radix Select (kompozycja `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/
  `SelectItem`). **Spełnia dla single.**
- **Braki:** brak multi-select (Radix Select jest single). Multi realizujemy przez Combobox (A9) —
  akceptowalne, ale warto potwierdzić z zespołem, czy multi-select ma być wariantem Selecta.

### A5. Checkbox — `control: "checkbox"` → **`Checkbox`** ✅

- **Scenariusze:** pola boolean prezentowane jako checkbox, wielokrotny wybór, **zaznaczanie wierszy
  w tabeli** (patrz B1).
- **Wymagane funkcje:** `checked`/kontrolowane, `disabled`, **`indeterminate`** (nagłówek „zaznacz
  wszystkie"). silk: obsługuje `checked="indeterminate"`. **Spełnia.**

### A6. Radio — `control: "radio"` → **`RadioButton` / `RadioGroup`** ✅

- **Scenariusze:** wybór jednej z kilku opcji (enum jako radio), `radio-card` dla bogatszych opcji.
- **Wymagane funkcje:** grupa, kontrolowana wartość, `disabled`, etykiety + tekst pomocniczy.
  **Spełnia** (`radio-button` + `radio-card`).

### A7. Switch — `control: "switch"` → **`Switch`** ✅

- **Scenariusze:** pola boolean (`isBlocked`, `isActive`) jako przełącznik.
- **Wymagane funkcje:** `checked`/`defaultChecked`/kontrolowane, `disabled`. **Spełnia.**

### A8. Date picker — `control: "date"` → **`DatePicker`** ✅

- **Scenariusze:** pola dat (`startDate`/`endDate`, `dueDate`); zakres dla filtrów.
- **Wymagane funkcje:** wybór pojedynczej daty **oraz zakresu**, `disabled`, lokalizacja/format,
  kontrolowane. silk: react-day-picker (`PropsSingle | PropsRange`). **Spełnia (single + range).**
- **Uwaga:** potwierdzić format wyjścia (ISO string vs `Date`) pod spięcie z Zod (`z.coerce.date`).

### A9. Combobox pola relacji — `control: "relation"` → **`Combobox`** ⚠️ **brak async-search**

- **Scenariusze:** pola relacji dociągające opcje z API — `Task.projectId → projects`,
  `Task.assigneeId → users`. Listy potencjalnie duże (setki/tysiące) → wyszukiwanie po stronie
  serwera.
- **Wymagane funkcje:** kontrolowana wartość (single **i** multi — `value: string[]`),
  **`onSearch(query)` z dociąganiem async**, stan `loading`, **debounce**, komunikaty „ładowanie"/
  „brak wyników", **utrzymanie etykiety wybranej wartości** gdy nie ma jej w bieżącej stronie
  wyników, `disabled`.
- **Stan silk:** Combobox istnieje, ale jest **synchroniczny** — filtruje statyczną listę dzieci
  (`searchValue` w stanie, `itemLabels` w mapie), `value: string[]` (multi OK). Brak `onSearch`,
  `loading`, debounce.
- **DO ZROBIENIA:** wariant/rozszerzenie **async** (`onSearch` → `Promise`, `loading`, debounce,
  puste/loading state, zachowanie etykiety wybranego). Bazą może być obecny Combobox + `search`.

### A10. Wrapper pola (label + hint + błąd + required) → **`FormItem`** ✅ (kluczowe dla `forms-ui`)

- **Scenariusze:** każdy renderer pola w `forms-ui` opakowuje kontrolkę: etykieta, tekst pomocniczy,
  **komunikat błędu walidacji**, znacznik `required`.
- **Wymagane funkcje:** `FormItem` + `FormItemLabel(required)` + `FormItemInput` + `FormItemHint` +
  `FormItemError`. silk **spełnia** — to fundament mapowania „typ pola → komponent" w `forms-ui`.

---

## B. Listy i prezentacja danych (`packages/ui` DataTable, Faza 6)

### B1. Table / prymitywy DataTable → ❌ **BRAK — priorytet #1**

- **Scenariusze:** listy encji w adminie (Project, Task i każda encja generowana przez scaffolder).
  Nasz `packages/ui` `DataTable` komponuje **na** prymitywach tabeli DS — bez nich cała lista admina
  nie ma podstawy.
- **Wymagane funkcje (prymitywy):** `Table`/`THead`/`TBody`/`Tr`/`Th`/`Td` (lub równoważne),
  z obsługą: **nagłówka sortowalnego** (wskaźnik kierunku, klik), **wyrównania kolumn** (lewo/prawo),
  **klikalnego/hoverowalnego wiersza** (nawigacja do detalu), opcjonalnie **kolumny zaznaczania**
  (checkbox + „zaznacz wszystkie", patrz A5), overflow/scroll poziomy, sticky header (opcjonalnie),
  spójność z DS (nie gołe `<table>`).
- **Zależności UI:** integruje się ze stanami **loading** (B-skeleton/spinner) i **empty** (EmptyState).
- **DO ZROBIENIA:** komplet prymitywów tabeli. (Opcjonalnie gotowy `DataTable` w silk, ale nasz
  `packages/ui` i tak dostarcza logikę sort/paginacja/stany — wystarczą prymitywy.)

### B2. Pagination → **`Pagination` / `Page`** ✅ (prymitywy)

- **Scenariusze:** stopka listy (paginacja offset-based: „Strona X z Y", poprzednia/następna).
- **Wymagane funkcje:** prymitywy `Pagination` (nav) + `Page` (button, stan aktywny/disabled) — nasz
  `DataTable` komponuje z nich kontrolki i steruje `page`/`onPageChange`. silk **dostarcza prymitywy.**
- **Braki:** brak — logika stronicowania jest po naszej stronie.

### B3. Badge statusu → **`Badge`** ✅ (mapowanie wariantów)

- **Scenariusze:** kolumna/detal statusu encji (`status`, `priority`) jako kolorowa etykieta.
- **Wymagane funkcje:** warianty semantyczne. silk `Badge`: `default/accent/positive/attention/
critical/fuchsia` + rozmiary. **Spełnia** — wymaga mapowania naszych tonów
  (`neutral/success/warning/danger/info` → `default/positive/attention/critical/accent`).
- **Uwaga:** `Status` w silk to **kropka obecności** (przy avatarze), NIE etykieta statusu — używamy `Badge`.

### B4. EmptyState → (w `packages/ui`, nie DS)

- Kompozycja po naszej stronie na prymitywach DS. **Nie jest luką DS** — wspomniane dla kompletności.

---

## C. Feedback i stany ładowania

### C1. Toast / powiadomienia → ❌ **BRAK — priorytet #2**

- **Scenariusze:** potwierdzenia akcji CRUD w adminie („Projekt usunięty", „Zapisano"), błędy
  operacji („Nie udało się usunąć"). Już używane w widokach admina i będą w submitach formularzy.
- **Wymagane funkcje:** **imperatywne API** (`toast(message, tone)` przez provider/hook),
  warianty `success/error/info` (+ ew. warning), **auto-dismiss** z konfigurowalnym czasem,
  **stacking** wielu powiadomień, akcja/close, dostępność (`role="status"`/aria-live).
- **DO ZROBIENIA:** komponent + provider/hook (np. na bazie sonner/radix-toast).

### C2. Skeleton → ❌ **BRAK — priorytet #3**

- **Scenariusze:** placeholdery treści podczas ładowania listy/detalu (wiersze tabeli, pola detalu).
- **Wymagane funkcje:** warianty kształtu (tekst/blok/koło), konfigurowalny rozmiar, animacja
  „pulse/shimmer”, komponowalny (np. skeleton wiersza tabeli).
- **DO ZROBIENIA:** komponent `Skeleton`.

### C3. Spinner / Loader → ❌ **BRAK — priorytet #3**

- **Scenariusze:** wskaźnik ładowania inline (przyciski w trakcie akcji, drobne obszary) oraz
  overlay/na środku (ładowanie widoku).
- **Wymagane funkcje:** indeterminate spinner, rozmiary, `aria-label`/`role="status"`, wariant
  inline i overlay. **Uwaga:** silk ma `progress-bar` (determinate) — to **nie** zastępuje spinnera.
- **DO ZROBIENIA:** komponent `Spinner`/`Loader`.

### C4. Alert (inline) → **`Alert`** ✅ (bonus, przydatny)

- **Scenariusze:** komunikaty inline w formularzach/stronach (błąd operacji, informacja). silk ma
  `Alert` — do wykorzystania zamiast doraźnych `<div role="alert">`.

---

## D. Overlay, nawigacja, wizard

### D1. Modal / Dialog → **`Modal`** ✅ (kompozycja Radix)

- **Scenariusze:** potwierdzenie usunięcia (admin), formularze w modalu (opcjonalnie).
- **Wymagane funkcje:** kontrolowany `open`/`onOpenChange`, tytuł, treść, stopka z akcjami, overlay,
  zamknięcie Escape/klik w tło, focus-trap, a11y. silk: pełna kompozycja Radix Dialog
  (`Modal`/`ModalTrigger`/`ModalContent`/`ModalTitle`/`ModalBody`/`ModalClose`…). **Spełnia.**
- **Uwaga integracyjna:** API kompozycyjne (inne niż nasz mock `open/onClose/title/footer`) →
  `packages/ui`/widoki wymagają adaptera przy podmianie.

### D2. Tabs → **`Tabs`** ✅

- **Scenariusze:** zakładki w detalu/ustawieniach. silk: Radix Tabs. **Spełnia.**

### D3. Stepper (kroki wizarda) → ❌ **BRAK — priorytet #4 (Faza 7)**

- **Scenariusze:** wizard „utwórz projekt" (3 kroki: dane → zaproszenia → zadania). Ogólny wizard
  wieloetapowy w `forms-ui`.
- **Wymagane funkcje:** lista kroków ze stanem (**done/active/upcoming**), wskaźnik postępu,
  nawigacja (dalej/wstecz, klik w krok jeśli dozwolony), **walidacja per krok** (blokada „dalej"),
  orientacja pozioma/pionowa, a11y.
- **Stan silk:** `tabs` i `segmented-control` **nie** pełnią tej roli. Można wywieść ze steppera na
  bazie tabs, ale wymaga dedykowanego komponentu.
- **DO ZROBIENIA:** komponent `Stepper`.

### D4. Dropdown menu (akcje) → **`DropdownMenu`** ✅ (bonus)

- **Scenariusze:** menu akcji wiersza (edytuj/usuń), menu użytkownika w headerze admina. silk ma
  `dropdown-menu`. **Spełnia** — warto wykorzystać.

### D5. Tooltip → **`Tooltip`** ✅ (bonus). Podpowiedzi przy ikonach/akcjach.

---

## E. Akcje i prymitywy

### E1. Button → **`Button`** ✅ (mapowanie wariantów)

- **Scenariusze:** akcje wszędzie (submit, anuluj, usuń, paginacja). silk `Button`: warianty
  `fill/outline/text` (+ tony) i rozmiary `s/m/l/xl`. **Spełnia** — mapowanie naszych
  `primary/secondary/danger/ghost` → warianty/tony silk. Wymagane: stan `disabled`, ikona,
  (nice-to-have) stan `loading` spięty ze Spinnerem (C3).

### E2. IconButton → **`IconButton`** ✅. Akcje ikonowe (zamknij, akcje wiersza).

### E3. Link → **`Link`** ✅ (prezentacyjny). Nawigację zapewnia router w skorupie (nie DS).

---

## F. Layout admina

### F1. Sidebar + Navigation → **`Sidebar` / `Navigation`** ✅ (bonus — może zastąpić nasz `AdminLayout`)

- **Scenariusze:** szkielet panelu admina (menu z rejestru encji + header). Obecnie mamy własny
  `AdminLayout` (router-agnostyczny, sloty `nav`/`actions`). silk `sidebar`+`navigation` mogą go
  zastąpić — wymaga sprawdzenia, czy pozostają **router-agnostyczne** (linki wstrzykiwane jako sloty),
  by nie naruszyć granicy „router tylko w `apps/*`".

---

## G. Luki integracyjne (nie komponenty — sposób konsumpcji)

Model bootstrapa: DS jako **git subtree** w `design-system/`, `packages/ui`/`forms-ui` komponują
**na** DS; env/router tylko w skorupach.

1. **Dystrybucja jako źródła TS** (`main → src/index.ts`, brak konsumowanego `dist`). Zgodne z naszym
   modelem (Tailwind kompiluje klasy przez `@source`), ale skorupa musi: zaimportować globalny CSS
   silk (`src/styles/global.css` + `shadcn-tokens.css`), **zbudować tokeny** (style-dictionary:
   `design.tokens.json` → CSS variables), owinąć drzewo w **`IconProvider`** (Phosphor), dodać
   `@source` na źródła silk (`baseColor: zinc`).
2. **Scope/nazwa:** silk = `@silk/components`; bootstrap odwołuje się do `@repo/design-system` →
   alias/re-export przy podmianie subtree.
3. **API ≠ nasz mock:** obecny `design-system/` (mock) ma propsy „pod inwentarz", realne API silk
   różni się (Combobox/Select/Modal kompozycyjne). **Podmiana mock → silk wymaga adaptacji
   `packages/ui` i mapowań `forms-ui`** — praca po stronie bootstrapa (ująć w wycenie), nie DS.
4. **Prośba do zespołu DS:** krótki **integration guide** (globalny CSS, tokeny, `IconProvider`,
   `@source`, mapowanie wariantów Button/Badge) + potwierdzenie router-agnostyczności Sidebar/Nav.

---

## H. Kolejność prac (rekomendacja)

**Fala 1 — MVP podmiany (odblokowuje refactor Fazy 6):**

1. **Table / prymitywy DataTable** (B1) — priorytet #1.
2. **Toast** (C1).
3. **Skeleton** (C2) + **Spinner** (C3).
4. Integration guide (G4).

Po Fali 1: podmiana placeholdera `design-system/` na subtree silk + adaptacja `packages/ui`.

**Fala 2 — pod formularze/relacje (Faza 7):**

5. **Combobox async-search** (A9).
6. **Stepper** (D3).

**Do potwierdzenia z zespołem:** multi-select jako wariant Selecta (A4), format daty w DatePicker
(A8), stan `loading` w Button spięty ze Spinnerem (E1), router-agnostyczność Sidebar/Navigation (F1).

> Reguła „DS read-only” (`design-system/README.md`): braki dorabiamy **w silk (upstream)**, nie
> lokalnie. Inwentarz referencyjny: `docs/ds-component-inventory.md`.
