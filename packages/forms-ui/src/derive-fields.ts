import type { Entity } from "@repo/schemas";
import type { z } from "zod";
import type { FieldDef } from "./field-renderer.js";

/**
 * Derives the form field definitions from an entity (`entity.fields` + `entity.schema`). The order
 * is the schema's key order. `required` comes from Zod (`!isOptional()`). A single source of truth.
 */
export function deriveFields<Shape extends z.ZodRawShape>(entity: Entity<Shape>): FieldDef[] {
  const shape = entity.schema.shape as Record<string, z.ZodTypeAny>;
  return Object.entries(entity.fields).map(([name, meta]) => ({
    name,
    label: meta.label,
    control: meta.control,
    help: meta.help,
    options: meta.options,
    relation: meta.relation,
    required: shape[name] ? !shape[name].isOptional() : undefined,
  }));
}

/** The empty starting values for create (checkbox/switch→false, number→undefined, rest→""). */
export function emptyValues<Shape extends z.ZodRawShape>(
  entity: Entity<Shape>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, meta] of Object.entries(entity.fields)) {
    // number/relation → undefined (an empty ""/uuid would fail validation), bool → false, rest → "".
    out[name] =
      meta.control === "checkbox" || meta.control === "switch"
        ? false
        : meta.control === "number" || meta.control === "relation"
          ? undefined
          : "";
  }
  return out;
}
