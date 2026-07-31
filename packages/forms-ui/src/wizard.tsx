import { Button, Stepper } from "@repo/design-system";
import { useWizard, type WizardApi, type WizardStep } from "@repo/forms";
import type { Entity } from "@repo/schemas";
import type { ReactNode } from "react";
import type { z } from "zod";
import { deriveFields } from "./derive-fields.js";
import type { RelationSource } from "./field-renderer.js";
import { FormFields } from "./form-fields.js";

/** Krok wizarda: metadane kroku (`useWizard`) + slot `render` na wstrzyknięty formularz/treść. */
export interface WizardStepConfig<V extends Record<string, unknown>> extends WizardStep {
  render: (wizard: WizardApi<V>) => ReactNode;
}

export interface WizardLabels {
  prev?: string;
  next?: string;
  submit?: string;
}

export interface WizardProps<V extends Record<string, unknown>> {
  steps: WizardStepConfig<V>[];
  defaultValues: V;
  onComplete: (values: V) => void | Promise<void>;
  /** Etykiety przycisków — domyślnie Wstecz/Dalej/Zakończ. */
  labels?: WizardLabels;
}

/**
 * Reużywalny wizard: NARZUCA strukturę (Stepper + treść kroku + pasek nawigacji) oraz stan i
 * walidację-gating (przez `useWizard`). Wstrzykujesz tylko `steps[].render` (formularz/treść kroku)
 * i `onComplete` (logikę). `WizardApi` spełnia `FormLike`, więc krok może wprost renderować
 * `<FormFields form={wizard} … />`. Kroki/stan/struktura nie są wymyślane na nowo przy każdym wizardzie.
 */
export function Wizard<V extends Record<string, unknown>>({
  steps,
  defaultValues,
  onComplete,
  labels,
}: WizardProps<V>) {
  const wizard = useWizard<V>({ steps, defaultValues, onComplete });
  return (
    <div className="flex flex-col gap-6">
      <Stepper
        steps={steps.map((step) => ({ id: step.id, label: step.label }))}
        current={wizard.stepIndex}
      />
      {steps[wizard.stepIndex]!.render(wizard)}
      {wizard.submitError && (
        // Błąd finalnej orkiestracji — dotyczy danych, nie pojedynczego pola, więc ma własne
        // miejsce w chrome wizarda. `WizardStepError` dodatkowo cofa do kroku, którego dotyczy.
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {wizard.submitError}
        </p>
      )}
      <div className="flex gap-2">
        {!wizard.isFirst && (
          <Button variant="secondary" onClick={wizard.prev}>
            {labels?.prev ?? "Wstecz"}
          </Button>
        )}
        {!wizard.isLast && <Button onClick={wizard.next}>{labels?.next ?? "Dalej"}</Button>}
        {wizard.isLast && (
          <Button onClick={wizard.submit} disabled={wizard.isSubmitting}>
            {labels?.submit ?? "Zakończ"}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Helper: krok = formularz encji (najczęstszy przypadek). Pola i schemat wywiedzione z encji
 * (jedno źródło prawdy) — zero boilerplate'u. `relationSource` wstrzykuje skorupa (pola relacji).
 */
export function entityStep<Shape extends z.ZodRawShape>(
  entity: Entity<Shape>,
  opts?: { label?: string; relationSource?: RelationSource },
): WizardStepConfig<Record<string, unknown>> {
  const fields = deriveFields(entity);
  return {
    id: entity.name,
    label: opts?.label ?? entity.label,
    schema: entity.validation,
    render: (wizard) => (
      <FormFields fields={fields} form={wizard} relationSource={opts?.relationSource} />
    ),
  };
}
