import { useCallback, useState } from "react";
import type { z } from "zod";
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
  stepIndex: number;
  step: WizardStep;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  setValue: <K extends keyof Values>(name: K, value: Values[K]) => void;
  /** Waliduje bieżący krok; jeśli OK → przechodzi dalej. */
  next: () => void;
  prev: () => void;
  /** Waliduje ostatni krok; jeśli OK → `onComplete(values)`. */
  submit: () => Promise<void>;
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

  const submit = useCallback(async () => {
    if (!validateStep(stepIndex)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onComplete(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, stepIndex, onComplete, values]);

  return {
    values,
    errors,
    stepIndex,
    step,
    isFirst: stepIndex === 0,
    isLast: stepIndex === steps.length - 1,
    isSubmitting,
    setValue,
    next,
    prev,
    submit,
  };
}
