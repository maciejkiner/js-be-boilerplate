import type { Entity } from "@repo/schemas";
import type { z } from "zod";
import type { FieldDef } from "./field-renderer.js";

/**
 * Wywodzi definicje pól formularza z encji (`entity.fields` + `entity.schema`). Kolejność =
 * kolejność kluczy schematu. `required` liczone z Zod (`!isOptional()`). Jedno źródło prawdy.
 */
export function deriveFields<Shape extends z.ZodRawShape>(entity: Entity<Shape>): FieldDef[] {
  const shape = entity.schema.shape as Record<string, z.ZodTypeAny>;
  return Object.entries(entity.fields).map(([name, meta]) => ({
    name,
    label: meta.label,
    control: meta.control,
    options: meta.options,
    relation: meta.relation,
    required: shape[name] ? !shape[name].isOptional() : undefined,
  }));
}

/** Puste wartości startowe dla create (checkbox/switch→false, number→undefined, reszta→""). */
export function emptyValues<Shape extends z.ZodRawShape>(
  entity: Entity<Shape>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, meta] of Object.entries(entity.fields)) {
    // number/relation → undefined (puste ""/uuid nie przejdzie walidacji), bool → false, reszta → "".
    out[name] =
      meta.control === "checkbox" || meta.control === "switch"
        ? false
        : meta.control === "number" || meta.control === "relation"
          ? undefined
          : "";
  }
  return out;
}
