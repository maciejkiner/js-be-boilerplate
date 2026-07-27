import type { FormApi } from "@repo/forms";
import { type FieldDef, FieldRenderer, type RelationSource } from "./field-renderer.js";

export interface FormFieldsProps {
  fields: FieldDef[];
  form: FormApi<Record<string, unknown>>;
  relationSource?: RelationSource;
  disabled?: boolean;
}

/** Renderuje listę pól spiętą ze stanem silnika (`@repo/forms`): value/error/onChange per pole. */
export function FormFields({ fields, form, relationSource, disabled }: FormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={form.values[field.name]}
          error={form.errors[field.name]}
          onChange={(value) => form.setValue(field.name, value)}
          onBlur={() => form.setFieldTouched(field.name)}
          relationSource={relationSource}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
