import { type FieldDef, FieldRenderer, type RelationSource } from "./field-renderer.js";

/**
 * Minimalny interfejs stanu formularza konsumowany przez `FormFields`. Spełniają go zarówno
 * `useForm` (`FormApi`) jak i `useWizard` (`WizardApi`) z `@repo/forms` — dzięki temu ten sam
 * renderer pól działa w formularzach i w krokach wizarda.
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

/** Renderuje listę pól spiętą ze stanem silnika (`@repo/forms`): value/error/onChange per pole. */
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
