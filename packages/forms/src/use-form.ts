import { useCallback, useState } from "react";
import type { z } from "zod";
import { errorMessage, FORM_ERROR_KEY, serverErrorToFieldErrors } from "./server-errors.js";

/** Error map: the key is the field path (`issue.path`), the value is the first message. */
export type FormErrors = Record<string, string>;

/** ZodError → per-field errors. First error per field; no path → `_form` (a global or cross-field error). */
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
  /** Validation schema (for example `entity.validation`, including cross-field rules). */
  schema: z.ZodType<unknown>;
  defaultValues: Values;
  /**
   * The handler run after successful validation; it receives the data parsed by Zod. It may throw —
   * the error (usually from the API) lands in `errors` instead of disappearing, so do NOT wrap it in
   * your own `try/catch` just to show a stand-in message.
   */
  onSubmit: (values: unknown) => void | Promise<void>;
  /** The global message when an error from `onSubmit` has none of its own (a dropped network, say). */
  submitErrorFallback?: string;
}

export interface FormApi<Values extends Record<string, unknown>> {
  values: Values;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  setValue: <K extends keyof Values>(name: K, value: Values[K]) => void;
  setFieldTouched: (name: keyof Values) => void;
  /** Overwrites the errors — for sources outside the schema (an API response mapped by hand). */
  setErrors: (errors: FormErrors) => void;
  /** Validates everything, sets the errors, and returns whether the values are valid. */
  validate: () => boolean;
  handleSubmit: (event?: { preventDefault: () => void }) => Promise<void>;
  reset: (next?: Values) => void;
}

/**
 * The headless engine for a single form. Value state + validation through Zod (per field and
 * cross-field via `refine`) + any (async) submit handler. No components — rendering lives in
 * `packages/forms-ui`.
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
        // An error from the handler (usually an API response) must NOT vanish: the `errors` from
        // problem+json land on the fields and the `detail` text becomes the global error. Otherwise
        // the rejected promise reaches nobody and the user sees a form that "did nothing".
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
