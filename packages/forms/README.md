[Home](../../README.md) › [Documentation](../../docs/README.md) › packages/forms

# packages/forms

The headless form engine — **pure logic, no components** (the renderers live in
`packages/forms-ui`). Small and homegrown, built on React + Zod. No router, no `import.meta.env`.

## API

- **`useForm({ schema, defaultValues, onSubmit })`** — a single form. Value state, validation through
  Zod (per field plus cross-field via `refine`), `errors` (a field → message map), `touched`,
  `isSubmitting`, `setValue`, `setErrors`, `handleSubmit` (validate → `onSubmit(parsed)`) and
  `reset`. The schema comes from the entity (`entity.validation` in `@repo/schemas`).
- **`useWizard({ steps, defaultValues, onComplete })`** — a multi-step wizard. Values are shared
  between steps; validation happens **per step** (`step.schema`); `next()` validates and advances,
  `prev()` goes back, `submit()` validates the last step and calls `onComplete(values)`. Inside
  `onComplete` you **orchestrate arbitrary handlers** — the point of the design: some data goes to
  the API, some to the mailer (independence from CRUD).
- **`zodErrorsToFieldErrors(error)`** — a `ZodError` → per-field errors (keyed by `issue.path`).
- **`serverErrorToFieldErrors(error)`** — an API error response → per-field errors. It reads the
  `errors` extension of problem+json (`[{ path, message }]`, also through `cause`) and recognises the
  shape **structurally**, so the engine does not depend on `@repo/api-client`. An empty path maps to
  `FORM_ERROR_KEY`.
- **`errorMessage(error, fallback?)`** — the message for the user (`ApiError.message` is `detail`).

## Errors from the API

`onSubmit` and `onComplete` **may throw** — the engine refuses to let such an error disappear:

| Where       | What happens                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------- |
| `useForm`   | fields from `errors` → `form.errors[field]`; the `detail` text → `form.errors._form`          |
| `useWizard` | the text → `submitError`; the fields → `errors`; a `WizardStepError` also returns to its step |

When wrapping an error for a step use `WizardStepError.from(stepId, error)` — it keeps the original
error as `cause`, so the field list survives. Writing
`new WizardStepError(stepId, error.message)` by hand loses it.

```ts
const form = useForm({
  schema: projectEntity.validation,
  defaultValues: { name: "", status: "active", startDate: "", endDate: "" },
  onSubmit: (values) => createProject.mutate(values),
});
```

Validation has a single source of truth — the same Zod schema as the API and the client
(`@repo/schemas`). Save & resume for wizards is deliberately omitted: it is an
[opt-in module](../../docs/recipes/opt-in/save-and-resume.md).

## Related

- [`packages/forms-ui`](../forms-ui/README.md) — the renderers that turn these fields into components
- [How to define a form](../../docs/recipes/how-to-define-a-form.md) — the recipe, including wizards
- [`packages/schemas`](../schemas/README.md) — where the schema and the field metadata come from
- [`packages/api-client`](../api-client/README.md) — the shape of the errors this engine maps
