# packages/forms

Headless silnik formularzy — **czysta logika, bez komponentów** (renderery w `packages/forms-ui`).
Własny, minimalny, oparty na React + Zod. Bez routera i `import.meta.env`.

## API

- **`useForm({ schema, defaultValues, onSubmit })`** — pojedynczy formularz. Stan wartości,
  walidacja przez Zod (per-pole + międzypolowa przez `refine`), `errors` (mapa pole→komunikat),
  `touched`, `isSubmitting`, `setValue`, `handleSubmit` (waliduje → `onSubmit(sparsowane)`), `reset`.
  Schemat bierzemy z encji (`entity.validation` z `@repo/schemas`).
- **`useWizard({ steps, defaultValues, onComplete })`** — wizard wielokrokowy. Wartości współdzielone
  między krokami; walidacja **per krok** (`step.schema`); `next()` (waliduje i przechodzi), `prev()`,
  `submit()` (waliduje ostatni krok → `onComplete(values)`). W `onComplete` **orkiestrujesz dowolne
  handlery** — kluczowe dla przypadku „część danych → API/baza, część → mailer" (separacja od CRUD).
- **`zodErrorsToFieldErrors(error)`** — `ZodError` → mapa błędów per pole (po `issue.path`).
- **`serverErrorToFieldErrors(error)`** — odpowiedź błędu z API → mapa błędów per pole. Czyta
  rozszerzenie `errors` z problem+json (`[{ path, message }]`; też przez `cause`), rozpoznając kształt
  **strukturalnie** — silnik nie zależy od `@repo/api-client`. Ścieżka pusta → `FORM_ERROR_KEY`.
- **`errorMessage(error, fallback?)`** — komunikat dla użytkownika (`ApiError.message` = `detail`).

## Błędy z API

`onSubmit`/`onComplete` **mogą rzucać** — silnik nie pozwala takiemu błędowi zniknąć:

| Gdzie       | Co się dzieje                                                                             |
| ----------- | ----------------------------------------------------------------------------------------- |
| `useForm`   | pola z `errors` → `form.errors[pole]`; treść `detail` → `form.errors._form`               |
| `useWizard` | treść → `submitError`; pola → `errors`; `WizardStepError` dodatkowo cofa do swojego kroku |

Opakowując błąd dla kroku używaj `WizardStepError.from(stepId, error)` — trzyma błąd źródłowy jako
`cause`, więc lista pól przeżywa. Ręczne `new WizardStepError(stepId, error.message)` gubi ją.

```ts
const form = useForm({
  schema: projectEntity.validation,
  defaultValues: { name: "", status: "active", startDate: "", endDate: "" },
  onSubmit: (values) => createProject.mutate(values),
});
```

Walidacja jest jednym źródłem prawdy — ten sam schemat Zod co API i klient (`@repo/schemas`).
Save & resume wizardów: świadomie POMINIĘTE (moduł opt-in, przepis w Fazie 9).
