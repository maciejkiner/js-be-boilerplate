import type { Entity, FieldControl } from "@repo/schemas";
import type { z } from "zod";

export interface FieldDescriptor {
  name: string;
  snake: string;
  control: FieldControl;
  label: string;
  options?: { value: string; label: string }[];
  relation?: { entity: string; displayField: string; targetPlural: string; core: boolean };
  required: boolean;
  sortable: boolean;
  filterable: boolean;
}

export interface EntityDescriptor {
  name: string;
  plural: string;
  Pascal: string;
  PascalPlural: string;
  label: string;
  labelPlural: string;
  displayField: string;
  fields: FieldDescriptor[];
}

export function pascal(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

/** Naiwna liczba mnoga (wystarcza dla konwencji encji). `user` → auth (encja core). */
function pluralize(entity: string): string {
  return entity === "user" ? "users" : `${entity}s`;
}

export function buildDescriptor(entity: Entity<z.ZodRawShape>): EntityDescriptor {
  const shape = entity.schema.shape as Record<string, z.ZodTypeAny>;
  const fields: FieldDescriptor[] = Object.entries(entity.fields).map(([name, meta]) => ({
    name,
    snake: camelToSnake(name),
    control: meta.control,
    label: meta.label,
    options: meta.options,
    relation: meta.relation
      ? {
          entity: meta.relation.entity,
          displayField: meta.relation.displayField,
          targetPlural: pluralize(meta.relation.entity),
          core: meta.relation.entity === "user",
        }
      : undefined,
    required: shape[name] ? !shape[name].isOptional() : true,
    sortable: Boolean(meta.list?.sortable),
    filterable: Boolean(meta.list?.filterable),
  }));
  return {
    name: entity.name,
    plural: entity.plural,
    Pascal: pascal(entity.name),
    PascalPlural: pascal(entity.plural),
    label: entity.label,
    labelPlural: entity.labelPlural,
    displayField: entity.displayField,
    fields,
  };
}
