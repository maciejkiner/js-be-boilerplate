import { useCallback, useState } from "react";
import type { z } from "zod";
import { errorMessage, serverErrorToFieldErrors } from "./server-errors.js";
import { type FormErrors, zodErrorsToFieldErrors } from "./use-form.js";

export interface WizardStep {
  id: string;
  label: string;
  /** The Zod schema validating THIS step's fields (Zod ignores the extra keys). */
  schema: z.ZodType<unknown>;
}

export interface UseWizardOptions<Values extends Record<string, unknown>> {
  steps: WizardStep[];
  defaultValues: Values;
  /** Called after the last step validates — THIS is where you orchestrate several handlers
   * (some data → the API/database, some → the mailer). Proof the engine is separate from CRUD. */
  onComplete: (values: Values) => void | Promise<void>;
}

export interface WizardApi<Values extends Record<string, unknown>> {
  values: Values;
  errors: FormErrors;
  /**
   * The error message from `onComplete` (the final orchestration). Separate from `errors` because it
   * does NOT belong to one field — it comes from the API and may concern data from any step.
   */
  submitError?: string;
  stepIndex: number;
  step: WizardStep;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  setValue: <K extends keyof Values>(name: K, value: Values[K]) => void;
  /** Overwrites the field errors — for sources outside the step schema (an API response). */
  setErrors: (errors: FormErrors) => void;
  /** Validates the current step; if it passes → moves on. */
  next: () => void;
  prev: () => void;
  /** Validates the last step; if it passes → `onComplete(values)`. */
  submit: () => Promise<void>;
  /** Jumps to a step by `id` — used when the final error names the step it belongs to. */
  goTo: (stepId: string) => void;
}

/**
 * An error from `onComplete` attached to a SPECIFIC step. Throw it when you know which data it
 * concerns — the wizard returns to that step and shows the message next to its content, instead of
 * leaving the user on the last step with a message about fields they cannot see there.
 */
export class WizardStepError extends Error {
  constructor(
    readonly stepId: string,
    message: string,
    /** The original error — the wizard extracts the field errors (`errors` from problem+json). */
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "WizardStepError";
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }

  /**
   * Wraps an API error, keeping it as `cause`. Preferred over copying `error.message` by hand: that
   * loses the field list, so the wizard returns to the step but can no longer highlight the control
   * that caused the error.
   */
  static from(stepId: string, error: unknown, fallbackMessage?: string): WizardStepError {
    return new WizardStepError(stepId, errorMessage(error, fallbackMessage), { cause: error });
  }
}

/**
 * A headless multi-step wizard. Values are shared between steps; validation happens per step (the
 * step's schema). The final `onComplete` orchestrates arbitrary handlers — the key case being "some
 * data to the database, some to the mailer" (the engine's separation from CRUD).
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
      // The final error must NOT escape the wizard: the user would be left on the last step with an
      // unhandled promise rejection and no information at all.
      setSubmitError(errorMessage(error, "Nie udało się ukończyć kreatora."));
      // When the API named fields (`errors` from problem+json) we mark them in the step's form —
      // the message in the wizard chrome alone does not say which control to fix.
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
