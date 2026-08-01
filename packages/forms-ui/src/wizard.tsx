import { Button, Stepper } from "@repo/design-system";
import { useWizard, type WizardApi, type WizardStep } from "@repo/forms";
import type { Entity } from "@repo/schemas";
import type { ReactNode } from "react";
import type { z } from "zod";
import { deriveFields } from "./derive-fields.js";
import type { RelationSource } from "./field-renderer.js";
import { FormFields } from "./form-fields.js";

/** A wizard step: the step metadata (`useWizard`) plus a `render` slot for the injected content. */
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
  /** Button labels — by default Wstecz/Dalej/Zakończ. */
  labels?: WizardLabels;
}

/**
 * A reusable wizard: it IMPOSES the structure (stepper + step content + a navigation bar) along with
 * the state and validation gating (through `useWizard`). You inject only `steps[].render` (the step's
 * form or content) and `onComplete` (the logic). `WizardApi` satisfies `FormLike`, so a step can
 * render `<FormFields form={wizard} … />` directly. Steps, state and structure are never reinvented.
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
        // The final orchestration error concerns the data, not a single field, so it has its own
        // place in the wizard chrome. `WizardStepError` additionally returns to the step it belongs to.
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
 * Helper: a step that is an entity form (the most common case). The fields and schema are derived
 * from the entity (a single source of truth) — zero boilerplate. The shell injects `relationSource`.
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
