import { Button } from "@repo/design-system";
import { useForm } from "@repo/forms";
import { deriveFields, FormFields, type RelationSource } from "@repo/forms-ui";
import type { Entity } from "@repo/schemas";
import type { z } from "zod";

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * ISO → the value of an `input[type=datetime-local]`, that is `YYYY-MM-DDTHH:mm` in **local** time.
 * Raw ISO (with seconds and a zone) is invalid for this control — the browser then shows an empty
 * field, and saving the form would wipe the value.
 */
function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** An API record → form values (ISO dates→yyyy-mm-dd, null→"", booleans for checkbox/switch). */
export function recordToFormValues<Shape extends z.ZodRawShape>(
  entity: Entity<Shape>,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, meta] of Object.entries(entity.fields)) {
    const value = record[name];
    if (meta.control === "date") {
      out[name] = value ? String(value).slice(0, 10) : "";
    } else if (meta.control === "datetime") {
      out[name] = value ? toDateTimeLocal(String(value)) : "";
    } else if (meta.control === "checkbox" || meta.control === "switch") {
      out[name] = Boolean(value);
    } else if (value == null) {
      out[name] = meta.control === "number" || meta.control === "relation" ? undefined : "";
    } else {
      out[name] = value;
    }
  }
  return out;
}

export interface EntityFormProps<Shape extends z.ZodRawShape> {
  entity: Entity<Shape>;
  defaultValues: Record<string, unknown>;
  onSubmit: (values: unknown) => Promise<void> | void;
  submitLabel: string;
  relationSource?: RelationSource;
}

/**
 * An entity form derived from the metadata: `deriveFields` (the fields) + `entity.validation` (Zod,
 * including cross-field rules) + `FormFields` (the DS renderers). One source of truth for create and
 * edit.
 */
export function EntityForm<Shape extends z.ZodRawShape>({
  entity,
  defaultValues,
  onSubmit,
  submitLabel,
  relationSource,
}: EntityFormProps<Shape>) {
  const form = useForm({ schema: entity.validation, defaultValues, onSubmit });
  const fields = deriveFields(entity);

  return (
    <form onSubmit={form.handleSubmit} className="flex max-w-lg flex-col gap-4">
      <FormFields fields={fields} form={form} relationSource={relationSource} />
      {form.errors._form && (
        // An error attached to no field: cross-field validation, or the API response (`detail` from
        // problem+json). Fields the API named are highlighted by `FormFields` — the rest lands here.
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {form.errors._form}
        </p>
      )}
      <div>
        <Button type="submit" disabled={form.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
