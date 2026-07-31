# CHANGELOG — recipe entries for agents

This changelog is **not the usual kind**: it is not a list of bootstrap changes for humans, but a set
of **recipes for an agent working in a forked project** — how to carry a fix into code that has
already drifted away from the bootstrap.

## The update loop (fork & forget + optional backport)

1. A project starts from a fork of the bootstrap; `BOOTSTRAP_VERSION` records the starting version
   (date + hash).
2. When you want to pull fixes across: take the entries in this file that are **newer** than the date
   in `BOOTSTRAP_VERSION`.
3. For each entry the agent applies the recipe (find the fragment → replace it), because the files may
   have changed — we do not assume a clean `git merge`, since the code belongs to the project. After
   backporting, update `BOOTSTRAP_VERSION`.

## Entry format

```
## YYYY-MM-DD — short title
- **What:** what changed or was fixed.
- **Why:** the reason (which problem or risk).
- **How to find it in your project:** paths and patterns that locate the fragment.
- **What to do:** the concrete change to apply (before/after, or steps).
- **Risk/rollback:** when it matters.
```

---

## 2026-07-27 — Baseline (phases 0–9)

- **What:** the first complete version of the bootstrap (monorepo, Fastify + Zod API, Drizzle, auth,
  the reference entity, the client generated from OpenAPI, the web and admin shells, the form engine,
  the scaffolder, containerization).
- **Why:** the starting point; later entries are backport recipes.
- **How to find it in your project:** the whole repository; `PLAN.md` describes the phases and
  `CLAUDE.md` the conventions.
- **What to do:** nothing — this is the reference point. Set `BOOTSTRAP_VERSION` to
  `2026-07-27 8694bcd`.

<!-- Add new entries ABOVE this comment, newest first. -->

## 2026-07-31 — An API error points at the form FIELD (the `errors` extension)

- **What:** (1) API: a uniqueness conflict is built by `uniqueConflictError(label, fields)`, so the
  409 carries `errors: [{ path, message }]` next to `detail` (the same shape as validation 400).
  (2) Client: `ApiError.errors`. (3) `@repo/forms`: `serverErrorToFieldErrors` and `errorMessage`;
  `useForm` catches an error thrown from `onSubmit` (fields → `errors`, text → `_form`), `useWizard`
  adds the field errors next to `submitError`, and `WizardStepError.from(stepId, error)` keeps the
  original error as `cause`. (4) Scaffolder templates: the create/edit views **without** a `try/catch`
  carrying a stand-in message. (5) Actions without a form (delete, user actions, login) show the text
  from the API through `errorMessage` from `@repo/api-client`; an e-mail conflict (`register` /
  `invite`) points at the `email` field. (6) E2E: `global-setup.ts` seeds the admin account, the new
  `api-errors.spec.ts` guards the regression, and CI gains a mailhog service (the suite goes through
  the mailer — without SMTP the wizard ended in a 500).
- **Why:** a 409 saying "wartości (slug) muszą być unikalne" reached the UI as a "Nie udało się
  utworzyć" toast (the view swallowed the exception), and even when shown it did not name the field,
  because the name lived only inside the `detail` sentence. The user learned neither what was wrong
  nor what to fix.
- **How to find it in your project:** `apps/api/src/db/unique-violation.ts`, `lib/http/problem.ts`
  (`ProblemFieldError`, `ConflictError` with `extensions`); `packages/api-client/src/api-error.ts`;
  `packages/forms/src/{server-errors.ts,use-form.ts,use-wizard.ts}`;
  `tools/scaffold/src/{be,fe}-templates.ts`; the generated `*.service.ts` files (the `UNIQUE_FIELDS`
  map) and the admin views (`onSubmit={async (values) => { try { … } catch { toast(…) } }}`).
- **What to do:** in the services, replace `UNIQUE_FIELDS: Record<string, string>` (a glued sentence)
  with `Record<string, string[]>` and `new ConflictError(...)` with
  `uniqueConflictError(label, fields)`; in the views, drop the `try/catch` around the mutation (keep
  the toast for success only); in wizards, replace `new WizardStepError(id, error.message)` with
  `WizardStepError.from(id, error)`; in actions, replace `onError: () => toast("…")` with
  `onError: (error) => toast(errorMessage(error, "…"))`.
- **Risk/rollback:** additive on the API contract (`errors` is an RFC 7807 extension — old consumers
  ignore it). The frontend behaviour does change: errors appear in the form rather than in a toast.
  Rollback means restoring the `try/catch` in the views; the API side can stay.

## 2026-07-28 — `FieldMeta` as a union discriminated by `control`

- **What:** `FieldMeta` (entity field metadata) went from a flat interface with everything optional to
  a **discriminated union** `SimpleFieldMeta | ChoiceFieldMeta | RelationFieldMeta`. The type now
  enforces the extras that depend on `control`: `select`/`radio` → `options` (required), `relation` →
  `relation` (required), simple fields → no `options`/`relation` (`?: never`). The README and the
  JSDoc act as the catalogue of every field type; a type-level test (`@ts-expect-error`) guards the
  enforcement.
- **Why:** the metadata was heterogeneous but the type did not say so — you could forget `options` on
  a `select`, or add them to a `text`, and nothing caught it until runtime.
- **How to find it in your project:** `packages/schemas/src/lib/define-entity.ts` (`FieldMeta` plus the
  `*FieldMeta` variants); the reads of `meta.options`/`meta.relation` in
  `packages/forms-ui/src/derive-fields.ts` and `tools/scaffold/src/descriptor.ts` (they work
  unchanged — `?: never` preserves property access).
- **What to do:** replace `interface FieldMeta {…}` with a `FieldMetaBase` plus three variants
  discriminated by `control`, and the union `type FieldMeta = …`. Entities with correct metadata
  compile unchanged; incorrect ones (a missing `options`/`relation`) start failing, which is the
  point.
- **Risk/rollback:** a type change, not a runtime one. Correct entities are untouched; if the backport
  reveals missing `options`/`relation`, fill them in. Rollback means returning to the flat
  `FieldMeta`.

## 2026-07-28 — `defineEntity` documentation + wiring up the `help` field

- **What:** (1) clarified documentation for `defineEntity` — JSDoc on
  `name`/`plural`/`label`/`labelPlural`, the `control` ↔ Zod type pairing (which requires
  `options`/`relation`), a usage example and cross-links; the `packages/schemas` README gained the
  pairing table and an example. (2) The `FieldMeta.help` field (dead until now) is rendered as a hint
  under the field in `forms-ui`.
- **Why:** DX — writing an entity from scratch gave you no way to tell which Zod type pairs with which
  `control`, what drives `plural`, or that `help` did nothing (declared but never rendered, which is
  worse than absent).
- **How to find it in your project:** `packages/schemas/src/lib/define-entity.ts` (the JSDoc on
  `FieldControl`, `FieldMeta`, `EntityDefinition`, `defineEntity`); `packages/schemas/README.md`;
  `packages/forms-ui/src/{field-renderer.tsx,derive-fields.ts}` (`FieldDef.help`, rendered in `Field`).
- **What to do:** carry over the JSDoc and README from the commit; in `forms-ui` add `help?: string` to
  `FieldDef`, copy `meta.help` in `deriveFields`, and render `field.help` in `Field` (a hint `<p>`
  under the control, before the error). Documentation plus additive rendering — no contract change.
- **Risk/rollback:** none (additive; entities without `help` behave as before).
