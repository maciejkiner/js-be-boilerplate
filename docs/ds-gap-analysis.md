[Home](../README.md) › [Documentation](./README.md) › Design-system gap analysis

# Design-system components the bootstrap needs (silk — gap analysis)

A document to hand to the **design-system team** (a separate track of work). It lists **every**
component the bootstrap requires, together with its status in silk, the missing capabilities, the
required API and the usage scenarios. Sources of the requirements: the section 10 inventory
([`docs/ds-component-inventory.md`](./ds-component-inventory.md)), the entity metadata
(`packages/schemas` → `FieldControl`), `packages/ui` (DataTable/AdminLayout/EmptyState), the admin
views (phase 6) and the form engine plus the wizard (phase 7).

- **Design system analysed:** `netguru/silk-storybook` (`@silk/components`), `main` @ `1d45f45`
  (2026-07-24).
- **silk stack:** React 19 · Tailwind v4 · Radix UI · shadcn/ui · style-dictionary (tokens) ·
  Phosphor icons · Storybook 10. Atomic structure. It exports **TypeScript sources**
  (`main → src/index.ts`). Aligned with the bootstrap (React 19 + Tailwind v4) — no technological
  conflict.

**Status legend:** ✅ ready (possibly with a name mapping) · ⚠️ present but missing capabilities ·
❌ absent.

**Gap summary:** ❌ Table/DataTable, Toast, Skeleton, Spinner, Stepper · ⚠️ Combobox (no async
search). Everything else among the fields and primitives is covered. Details below.

---

## A. Form fields (the `FieldControl` entity metadata + `forms-ui`, phase 7)

Every field must work in **controlled** mode (`value`/`onChange`), support `disabled` and the
**validation error** state (wired into `FormItem`), and have an accessible label (`id`/`aria`).

### A1. Text input — `control: "text"` → **`TextField`** ✅

- **Scenarios:** the `name`/`title` fields of an entity (create/edit), login (e-mail and password),
  the search field in a list toolbar.
- **Required capabilities:** an `<input>` passthrough (types text/email/password/number), `disabled`,
  `placeholder`, a controlled `value`, sizes. silk: `TextField` is
  `Omit<ComponentProps<"input">>` + `size` plus an icon/clear slot. **Satisfied.**
- **Gaps:** none — the error state is handled by `FormItem` (A10).

### A2. Number — `control: "number"` → **`TextField type="number"`** ✅ (⚠️ no dedicated component)

- **Scenarios:** the `estimate` field (Task), any numeric entity field.
- **Required capabilities:** entering numbers, min/max/step, controlled. `TextField` with
  `type="number"` covers it. There is also a `quantity-selector` (a +/− stepper), but that is a
  **different** case (quantities), not a general numeric field.
- **Gaps:** none blocking (optionally a dedicated `NumberField` with formatting — nice to have).

### A3. Textarea — `control: "textarea"` → **`Textarea`** ✅

- **Scenarios:** the `description` fields of entities.
- **Required capabilities:** a `<textarea>` passthrough, `rows`, `disabled`, controlled, errors
  through `FormItem`. **Satisfied.**

### A4. Select / enum — `control: "select"` → **`Select`** ✅ (single)

- **Scenarios:** enum fields (`status`, `priority`), column filters in the list toolbar.
- **Required capabilities:** choosing one value from a list, `placeholder`,
  `defaultValue`/controlled, `disabled`. silk: a Radix Select composition
  (`Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`). **Satisfied for single
  select.**
- **Gaps:** no multi-select (Radix Select is single). We implement multi through the Combobox (A9) —
  acceptable, but worth confirming with the team whether multi-select should be a Select variant.

### A5. Checkbox — `control: "checkbox"` → **`Checkbox`** ✅

- **Scenarios:** boolean fields presented as a checkbox, multiple choice, and **row selection in a
  table** (see B1).
- **Required capabilities:** `checked`/controlled, `disabled`, **`indeterminate`** (the "select all"
  header). silk supports `checked="indeterminate"`. **Satisfied.**

### A6. Radio — `control: "radio"` → **`RadioButton` / `RadioGroup`** ✅

- **Scenarios:** choosing one of several options (an enum as radio buttons), `radio-card` for richer
  options.
- **Required capabilities:** a group, a controlled value, `disabled`, labels plus helper text.
  **Satisfied** (`radio-button` + `radio-card`).

### A7. Switch — `control: "switch"` → **`Switch`** ✅

- **Scenarios:** boolean fields (`isBlocked`, `isActive`) as a toggle.
- **Required capabilities:** `checked`/`defaultChecked`/controlled, `disabled`. **Satisfied.**

### A8. Date picker — `control: "date"` → **`DatePicker`** ✅

- **Scenarios:** date fields (`startDate`/`endDate`, `dueDate`); ranges for filters.
- **Required capabilities:** picking a single date **and a range**, `disabled`, localisation and
  format, controlled. silk: react-day-picker (`PropsSingle | PropsRange`). **Satisfied (single +
  range).**
- **Note:** confirm the output format (an ISO string versus a `Date`) for wiring into Zod
  (`z.coerce.date`).

### A9. Relation-field combobox — `control: "relation"` → **`Combobox`** ⚠️ **no async search**

- **Scenarios:** relation fields pulling options from the API — `Task.projectId → projects`,
  `Task.assigneeId → users`. The lists can be large (hundreds or thousands), so the search belongs on
  the server.
- **Required capabilities:** a controlled value (single **and** multi — `value: string[]`),
  **`onSearch(query)` with async fetching**, a `loading` state, **debouncing**, "loading" and "no
  results" messages, **keeping the label of the selected value** when it is not on the current page of
  results, `disabled`.
- **State in silk:** the Combobox exists but is **synchronous** — it filters a static list of children
  (`searchValue` in state, `itemLabels` in a map), `value: string[]` (multi is fine). There is no
  `onSearch`, no `loading`, no debouncing.
- **TO DO:** an **async** variant or extension (`onSearch` → `Promise`, `loading`, debouncing,
  empty/loading states, preserving the selected label). The current Combobox plus `search` can be the
  base.

### A10. Field wrapper (label + hint + error + required) → **`FormItem`** ✅ (crucial for `forms-ui`)

- **Scenarios:** every field renderer in `forms-ui` wraps its control: the label, helper text, the
  **validation error message** and the `required` marker.
- **Required capabilities:** `FormItem` + `FormItemLabel(required)` + `FormItemInput` +
  `FormItemHint` + `FormItemError`. silk **satisfies** this — it is the foundation of the "field type
  → component" mapping in `forms-ui`.

---

## B. Lists and data presentation (`packages/ui` DataTable, phase 6)

### B1. Table / DataTable primitives → ❌ **MISSING — priority #1**

- **Scenarios:** entity lists in the admin panel (Project, Task and every entity the scaffolder
  generates). Our `packages/ui` `DataTable` composes **on** the design system's table primitives —
  without them the entire admin list has no foundation.
- **Required capabilities (primitives):** `Table`/`THead`/`TBody`/`Tr`/`Th`/`Td` (or equivalents)
  supporting a **sortable header** (direction indicator, click), **column alignment** (left/right), a
  **clickable and hoverable row** (navigating to the detail page), optionally a **selection column**
  (a checkbox plus "select all", see A5), horizontal overflow/scrolling, optionally a sticky header,
  and consistency with the design system (not a bare `<table>`).
- **UI dependencies:** it integrates with the **loading** (skeleton/spinner) and **empty**
  (EmptyState) states.
- **TO DO:** the full set of table primitives. (Optionally a ready-made `DataTable` in silk, but our
  `packages/ui` provides the sorting, pagination and state logic anyway — the primitives are enough.)

### B2. Pagination → **`Pagination` / `Page`** ✅ (primitives)

- **Scenarios:** the list footer (offset-based pagination: "Page X of Y", previous/next).
- **Required capabilities:** the `Pagination` (nav) and `Page` (button, active/disabled state)
  primitives — our `DataTable` composes the controls from them and drives `page`/`onPageChange`. silk
  **provides the primitives.**
- **Gaps:** none — the paging logic is on our side.

### B3. Status badge → **`Badge`** ✅ (variant mapping)

- **Scenarios:** the status column or detail field of an entity (`status`, `priority`) as a coloured
  label.
- **Required capabilities:** semantic variants. silk's `Badge`:
  `default/accent/positive/attention/critical/fuchsia` plus sizes. **Satisfied** — it needs a mapping
  of our tones (`neutral/success/warning/danger/info` → `default/positive/attention/critical/accent`).
- **Note:** `Status` in silk is a **presence dot** (next to an avatar), NOT a status label — we use
  `Badge`.

### B4. EmptyState → (in `packages/ui`, not the design system)

- A composition on our side over design-system primitives. **Not a DS gap** — mentioned for
  completeness.

---

## C. Feedback and loading states

### C1. Toast / notifications → ❌ **MISSING — priority #2**

- **Scenarios:** confirmations of CRUD actions in the admin panel ("Projekt usunięty", "Zapisano") and
  operation errors ("Nie udało się usunąć"). Already used in the admin views, and they will appear in
  form submissions.
- **Required capabilities:** an **imperative API** (`toast(message, tone)` through a provider or
  hook), `success/error/info` variants (plus possibly warning), **auto-dismiss** with a configurable
  delay, **stacking** of several notifications, an action and a close button, accessibility
  (`role="status"`/aria-live).
- **TO DO:** the component plus a provider/hook (for example on top of sonner or radix-toast).

### C2. Skeleton → ❌ **MISSING — priority #3**

- **Scenarios:** content placeholders while a list or detail view loads (table rows, detail fields).
- **Required capabilities:** shape variants (text/block/circle), a configurable size, a
  pulse/shimmer animation, composability (a table-row skeleton, for instance).
- **TO DO:** a `Skeleton` component.

### C3. Spinner / Loader → ❌ **MISSING — priority #3**

- **Scenarios:** an inline loading indicator (buttons during an action, small areas) and an
  overlay/centred one (a view loading).
- **Required capabilities:** an indeterminate spinner, sizes, `aria-label`/`role="status"`, inline and
  overlay variants. **Note:** silk has a `progress-bar` (determinate) — that does **not** replace a
  spinner.
- **TO DO:** a `Spinner`/`Loader` component.

### C4. Alert (inline) → **`Alert`** ✅ (a bonus, and useful)

- **Scenarios:** inline messages in forms and pages (an operation error, a piece of information). silk
  has `Alert` — to be used instead of ad-hoc `<div role="alert">` elements.

---

## D. Overlays, navigation, wizards

### D1. Modal / Dialog → **`Modal`** ✅ (a Radix composition)

- **Scenarios:** delete confirmation (admin), optionally forms inside a modal.
- **Required capabilities:** controlled `open`/`onOpenChange`, a title, content, a footer with
  actions, an overlay, closing on Escape and on a background click, focus trapping, accessibility.
  silk: the full Radix Dialog composition
  (`Modal`/`ModalTrigger`/`ModalContent`/`ModalTitle`/`ModalBody`/`ModalClose`…). **Satisfied.**
- **Integration note:** the API is compositional (unlike our mock's `open/onClose/title/footer`), so
  `packages/ui` and the views will need an adapter at swap time.

### D2. Tabs → **`Tabs`** ✅

- **Scenarios:** tabs on a detail or settings page. silk: Radix Tabs. **Satisfied.**

### D3. Stepper (wizard steps) → ❌ **MISSING — priority #4 (phase 7)**

- **Scenarios:** the "create a project" wizard (three steps: data → invitations → tasks). The general
  multi-step wizard in `forms-ui`.
- **Required capabilities:** a list of steps with state (**done/active/upcoming**), a progress
  indicator, navigation (next/back, clicking a step when allowed), **per-step validation** (blocking
  "next"), horizontal and vertical orientation, accessibility.
- **State in silk:** `tabs` and `segmented-control` do **not** play this role. A stepper could be
  derived from tabs, but it needs a dedicated component.
- **TO DO:** a `Stepper` component.

### D4. Dropdown menu (actions) → **`DropdownMenu`** ✅ (bonus)

- **Scenarios:** a row action menu (edit/delete), the user menu in the admin header. silk has
  `dropdown-menu`. **Satisfied** — worth using.

### D5. Tooltip → **`Tooltip`** ✅ (bonus). Hints on icons and actions.

---

## E. Actions and primitives

### E1. Button → **`Button`** ✅ (variant mapping)

- **Scenarios:** actions everywhere (submit, cancel, delete, pagination). silk's `Button`:
  `fill/outline/text` variants (plus tones) and `s/m/l/xl` sizes. **Satisfied** — our
  `primary/secondary/danger/ghost` map onto silk's variants and tones. Required: a `disabled` state
  and an icon; nice to have: a `loading` state wired to the Spinner (C3).

### E2. IconButton → **`IconButton`** ✅. Icon-only actions (close, row actions).

### E3. Link → **`Link`** ✅ (presentational). Navigation comes from the router in the shell, not the

design system.

---

## F. Admin layout

### F1. Sidebar + Navigation → **`Sidebar` / `Navigation`** ✅ (bonus — it may replace our `AdminLayout`)

- **Scenarios:** the skeleton of the admin panel (a menu from the entity registry plus a header). Right
  now we have our own `AdminLayout` (router-agnostic, with `nav`/`actions` slots). silk's `sidebar` and
  `navigation` could replace it — we need to check that they stay **router-agnostic** (links injected
  as slots) so the "router only in `apps/*`" boundary holds.

---

## G. Integration gaps (not components — how it is consumed)

The bootstrap's model: the design system as a **git subtree** in `design-system/`, with `packages/ui`
and `forms-ui` composing **on** it; the environment and the router only in the shells.

1. **Distribution as TypeScript sources** (`main → src/index.ts`, no consumed `dist`). Compatible with
   our model (Tailwind compiles the classes through `@source`), but the shell has to import silk's
   global CSS (`src/styles/global.css` + `shadcn-tokens.css`), **build the tokens** (style-dictionary:
   `design.tokens.json` → CSS variables), wrap the tree in **`IconProvider`** (Phosphor) and point
   `@source` at silk's sources (`baseColor: zinc`).
2. **Scope and name:** silk is `@silk/components` while the bootstrap refers to `@repo/design-system`
   → an alias or re-export when the subtree is swapped in.
3. **The API differs from our mock:** the current `design-system/` mock has props shaped "to the
   inventory", while silk's real API differs (Combobox, Select and Modal are compositional).
   **Swapping the mock for silk requires adapting `packages/ui` and the `forms-ui` mappings** — work on
   the bootstrap side (include it in the estimate), not on the design system's.
4. **A request to the design-system team:** a short **integration guide** (global CSS, tokens,
   `IconProvider`, `@source`, the Button/Badge variant mapping) plus confirmation that Sidebar and
   Navigation are router-agnostic.

---

## H. Recommended order of work

**Wave 1 — the swap MVP (unblocks the phase 6 refactor):**

1. **Table / DataTable primitives** (B1) — priority #1.
2. **Toast** (C1).
3. **Skeleton** (C2) + **Spinner** (C3).
4. The integration guide (G4).

After wave 1: replace the `design-system/` placeholder with the silk subtree and adapt `packages/ui`.

**Wave 2 — for forms and relations (phase 7):**

5. **Async-search Combobox** (A9).
6. **Stepper** (D3).

**To confirm with the team:** multi-select as a Select variant (A4), the date format in DatePicker
(A8), a `loading` state in Button wired to the Spinner (E1), and whether Sidebar/Navigation are
router-agnostic (F1).

> The "DS read-only" rule (`design-system/README.md`): gaps are filled **in silk (upstream)**, never
> locally. The reference inventory: [`docs/ds-component-inventory.md`](./ds-component-inventory.md).

## Related

- [`ds-component-inventory.md`](./ds-component-inventory.md) — the component vocabulary the bootstrap uses
- [How to update the design system](./recipes/how-to-update-the-design-system.md) — the swap procedure
- [`packages/forms-ui`](../packages/forms-ui/README.md) — the mapping that will need adapting
- [`packages/ui`](../packages/ui/README.md) — the compositions that absorb the DS API differences
