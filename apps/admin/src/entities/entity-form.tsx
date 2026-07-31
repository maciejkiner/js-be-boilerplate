import { Button } from "@repo/design-system";
import { useForm } from "@repo/forms";
import { deriveFields, FormFields, type RelationSource } from "@repo/forms-ui";
import type { Entity } from "@repo/schemas";
import type { z } from "zod";

const pad = (value: number): string => String(value).padStart(2, "0");

/**
 * ISO → wartość `input[type=datetime-local]`, czyli `YYYY-MM-DDTHH:mm` w czasie **lokalnym**.
 * Surowe ISO (z sekundami i strefą) jest dla tej kontrolki nieprawidłowe — przeglądarka pokazuje
 * wtedy puste pole, a zapis formularza wyczyściłby wartość.
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

/** Rekord z API → wartości formularza (daty ISO→yyyy-mm-dd, null→"", bool dla checkbox/switch). */
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
 * Formularz encji wywiedziony z metadanych: `deriveFields` (pola) + `entity.validation` (Zod,
 * z walidacją międzypolową) + `FormFields` (renderery DS). Jedno źródło prawdy dla create i edit.
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
        // Błąd bez przypisania do pola: walidacja międzypolowa albo odpowiedź API (`detail`
        // z problem+json). Pola wskazane przez API podświetla `FormFields` — tu ląduje reszta.
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
