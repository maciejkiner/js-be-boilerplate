import { useCallback, useState } from "react";
import type { z } from "zod";
import { errorMessage, serverErrorToFieldErrors } from "./server-errors.js";
import { type FormErrors, zodErrorsToFieldErrors } from "./use-form.js";

export interface WizardStep {
  id: string;
  label: string;
  /** Zod schema walidujący pola TEGO kroku (nadmiarowe klucze Zod ignoruje). */
  schema: z.ZodType<unknown>;
}

export interface UseWizardOptions<Values extends Record<string, unknown>> {
  steps: WizardStep[];
  defaultValues: Values;
  /** Wywoływane po walidacji ostatniego kroku — TU orkiestrujesz wiele handlerów
   * (np. część danych → API/baza, część → mailer). Dowód separacji silnika od CRUD. */
  onComplete: (values: Values) => void | Promise<void>;
}

export interface WizardApi<Values extends Record<string, unknown>> {
  values: Values;
  errors: FormErrors;
  /**
   * Komunikat błędu z `onComplete` (orkiestracja finalna). Osobny od `errors`, bo NIE dotyczy
   * pojedynczego pola — pochodzi z API i może dotyczyć danych z dowolnego kroku.
   */
  submitError?: string;
  stepIndex: number;
  step: WizardStep;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  setValue: <K extends keyof Values>(name: K, value: Values[K]) => void;
  /** Nadpisuje błędy pól — dla źródeł spoza schematu kroku (np. odpowiedź API). */
  setErrors: (errors: FormErrors) => void;
  /** Waliduje bieżący krok; jeśli OK → przechodzi dalej. */
  next: () => void;
  prev: () => void;
  /** Waliduje ostatni krok; jeśli OK → `onComplete(values)`. */
  submit: () => Promise<void>;
  /** Skok do kroku po `id` — używane, gdy błąd finalny wskazuje krok, którego dotyczy. */
  goTo: (stepId: string) => void;
}

/**
 * Błąd z `onComplete` przypisany do KONKRETNEGO kroku. Rzuć go, gdy wiadomo, których danych
 * dotyczy — wizard wróci do tego kroku i pokaże komunikat obok jego treści, zamiast zostawiać
 * użytkownika na ostatnim kroku z komunikatem o polach, których tam nie widzi.
 */
export class WizardStepError extends Error {
  constructor(
    readonly stepId: string,
    message: string,
    /** Błąd źródłowy — wizard wyciąga z niego błędy pól (`errors` z problem+json). */
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "WizardStepError";
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }

  /**
   * Opakowuje błąd z API, zachowując go jako `cause`. Preferowane nad ręcznym przepisywaniem
   * `error.message`: tamto gubi listę pól, więc wizard cofa do kroku, ale nie potrafi już
   * podświetlić kontrolki, która wywołała błąd.
   */
  static from(stepId: string, error: unknown, fallbackMessage?: string): WizardStepError {
    return new WizardStepError(stepId, errorMessage(error, fallbackMessage), { cause: error });
  }
}

/**
 * Headless wizard wielokrokowy. Wartości współdzielone między krokami; walidacja per krok
 * (schemat kroku). Finalny `onComplete` orkiestruje dowolne handlery — kluczowe dla przypadku
 * „część danych do bazy, część do mailera" (separacja silnika od CRUD).
 */
export function useWizard<Values extends Record<string, unknown>>(
  options: UseWizardOptions<Values>,
): WizardApi<Values> {
  const { steps, defaultValues, onComplete } = options;
  const [values, setValues] = useState<Values>(defaultValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const step = steps[stepIndex]!;

  const setValue = useCallback(<K extends keyof Values>(name: K, value: Values[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const validateStep = useCallback(
    (index: number): boolean => {
      const result = steps[index]!.schema.safeParse(values);
      if (result.success) {
        setErrors({});
        return true;
      }
      setErrors(zodErrorsToFieldErrors(result.error));
      return false;
    },
    [steps, values],
  );

  const next = useCallback(() => {
    if (validateStep(stepIndex) && stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
  }, [validateStep, stepIndex, steps.length]);

  const prev = useCallback(() => {
    setErrors({});
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goTo = useCallback(
    (stepId: string) => {
      const index = steps.findIndex((candidate) => candidate.id === stepId);
      if (index >= 0) {
        setStepIndex(index);
      }
    },
    [steps],
  );

  const submit = useCallback(async () => {
    if (!validateStep(stepIndex)) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(undefined);
    try {
      await onComplete(values);
    } catch (error) {
      // Błąd finalny NIE może wylecieć poza wizard: użytkownik stoi wtedy na ostatnim kroku
      // z nieobsłużonym odrzuceniem promise'a i bez żadnej informacji.
      setSubmitError(errorMessage(error, "Nie udało się ukończyć kreatora."));
      // Gdy API wskazało pola (`errors` z problem+json), zaznaczamy je w formularzu kroku —
      // sam komunikat w chrome wizarda nie mówi, którą kontrolkę poprawić.
      setErrors(serverErrorToFieldErrors(error));
      if (error instanceof WizardStepError) {
        goTo(error.stepId);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, stepIndex, onComplete, values, goTo]);

  return {
    values,
    errors,
    submitError,
    stepIndex,
    step,
    isFirst: stepIndex === 0,
    isLast: stepIndex === steps.length - 1,
    isSubmitting,
    setValue,
    setErrors,
    next,
    prev,
    submit,
    goTo,
  };
}
