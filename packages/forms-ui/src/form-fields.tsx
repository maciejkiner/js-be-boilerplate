import { type FieldDef, FieldRenderer, type RelationSource } from "./field-renderer.js";

/**
 * The minimal form-state interface consumed by `FormFields`. Both `useForm` (`FormApi`) and
 * `useWizard` (`WizardApi`) from `@repo/forms` satisfy it — which is what lets the same field
 * renderer work in forms and in wizard steps.
 */
export interface FormLike {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  setValue: (name: string, value: unknown) => void;
  setFieldTouched?: (name: string) => void;
}

export interface FormFieldsProps {
  fields: FieldDef[];
  form: FormLike;
  relationSource?: RelationSource;
  disabled?: boolean;
}

/** Renders a list of fields bound to the engine state (`@repo/forms`): value/error/onChange each. */
export function FormFields({ fields, form, relationSource, disabled }: FormFieldsProps) {
  const visible = fields.filter((field) => !field.visibleWhen || field.visibleWhen(form.values));
  return (
    <div className="flex flex-col gap-4">
      {visible.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={form.values[field.name]}
          error={form.errors[field.name]}
          onChange={(value) => form.setValue(field.name, value)}
          onBlur={() => form.setFieldTouched?.(field.name)}
          relationSource={relationSource}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
