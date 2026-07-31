import { useCallback, useState } from "react";
import type { z } from "zod";
import { errorMessage, FORM_ERROR_KEY, serverErrorToFieldErrors } from "./server-errors.js";

/** Mapa błędów: klucz = ścieżka pola (`issue.path`), wartość = pierwszy komunikat. */
export type FormErrors = Record<string, string>;

/** ZodError → błędy per pole. Pierwszy błąd na pole; brak ścieżki → `_form` (błąd globalny/międzypolowy bez path). */
export function zodErrorsToFieldErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!(key in errors)) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export interface UseFormOptions<Values extends Record<string, unknown>> {
  /** Schemat walidacji (np. `entity.validation` — z walidacją międzypolową). */
  schema: z.ZodType<unknown>;
  defaultValues: Values;
  /**
   * Handler po pomyślnej walidacji; dostaje sparsowane (przez Zod) dane. Może rzucać — błąd
   * (zwykle z API) trafi do `errors` zamiast zniknąć, więc NIE otaczaj go własnym `try/catch`
   * tylko po to, żeby pokazać zastępczy komunikat.
   */
  onSubmit: (values: unknown) => void | Promise<void>;
  /** Komunikat globalny, gdy błąd z `onSubmit` nie ma własnego (np. zerwana sieć). */
  submitErrorFallback?: string;
}

export interface FormApi<Values extends Record<string, unknown>> {
  values: Values;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setValue: <K extends keyof Values>(name: K, value: Values[K]) => void;
  setFieldTouched: (name: keyof Values) => void;
  /** Nadpisuje błędy — dla źródeł spoza schematu (np. odpowiedź API mapowana ręcznie). */
  setErrors: (errors: FormErrors) => void;
  /** Waliduje całość, ustawia błędy, zwraca czy poprawne. */
  validate: () => boolean;
  handleSubmit: (event?: { preventDefault: () => void }) => Promise<void>;
  reset: (next?: Values) => void;
}

/**
 * Headless silnik pojedynczego formularza. Stan wartości + walidacja przez Zod (per-pole i
 * międzypolowa z `refine`) + dowolny (async) handler submitu. Bez komponentów — renderowanie
 * w `packages/forms-ui`.
 */
export function useForm<Values extends Record<string, unknown>>(
  options: UseFormOptions<Values>,
): FormApi<Values> {
  const { schema, defaultValues, onSubmit, submitErrorFallback } = options;
  const [values, setValues] = useState<Values>(defaultValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(<K extends keyof Values>(name: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setFieldTouched = useCallback((name: keyof Values) => {
    setTouched((prev) => ({ ...prev, [name as string]: true }));
  }, []);

  const runValidation = useCallback((): { ok: boolean; data?: unknown } => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return { ok: true, data: result.data };
    }
    setErrors(zodErrorsToFieldErrors(result.error));
    return { ok: false };
  }, [schema, values]);

  const validate = useCallback(() => runValidation().ok, [runValidation]);

  const handleSubmit = useCallback(
    async (event?: { preventDefault: () => void }) => {
      event?.preventDefault();
      const result = runValidation();
      if (!result.ok) {
        return;
      }
      setIsSubmitting(true);
      try {
        await onSubmit(result.data);
      } catch (error) {
        // Błąd z handlera (zwykle odpowiedź API) NIE może zniknąć: `errors` z problem+json lądują
        // na polach, a treść `detail` — w błędzie globalnym. Inaczej odrzucony promise nigdzie nie
        // dociera i użytkownik widzi formularz, który „nic nie zrobił".
        setErrors({
          ...serverErrorToFieldErrors(error),
          [FORM_ERROR_KEY]: errorMessage(error, submitErrorFallback),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [runValidation, onSubmit, submitErrorFallback],
  );

  const reset = useCallback(
    (next?: Values) => {
      setValues(next ?? defaultValues);
      setErrors({});
      setTouched({});
    },
    [defaultValues],
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    setErrors,
    validate,
    handleSubmit,
    reset,
  };
}
