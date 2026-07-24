import type { z } from "zod";

/** Typ pola formularza → komponent DS (mapping jawny w packages/forms-ui, Faza 7). */
export type FieldControl =
  "text" | "textarea" | "number" | "select" | "checkbox" | "radio" | "switch" | "date" | "relation";

export interface FieldOption {
  value: string;
  label: string;
}

export interface RelationMeta {
  /** Nazwa encji docelowej (np. "project", "user"). */
  entity: string;
  /** Pole encji docelowej pokazywane w comboboxie / jako etykieta. */
  displayField: string;
}

/** Konfiguracja kolumny w DataTable admina. */
export interface ListColumnMeta {
  /** Domyślnie true. */
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Metadane pola — WYŁĄCZNIE prezentacja. Walidacji nie duplikujemy tu (wynika z Zoda);
 * walidacje międzypolowe idą przez `refine` na encji.
 */
export interface FieldMeta {
  label: string;
  control: FieldControl;
  help?: string;
  /** Dla control "select"/"radio". */
  options?: FieldOption[];
  /** Dla control "relation". */
  relation?: RelationMeta;
  list?: ListColumnMeta;
}

export interface EntityDefinition<Shape extends z.ZodRawShape> {
  name: string;
  plural: string;
  label: string;
  labelPlural: string;
  /** Pole używane jako etykieta encji (np. w comboboxach relacji do niej). */
  displayField: keyof Shape & string;
  schema: z.ZodObject<Shape>;
  /** Metadane muszą pokryć DOKŁADNIE klucze schematu — drift łapie TS. */
  fields: { [K in keyof Shape]: FieldMeta };
  /** Walidacje międzypolowe — zwraca pełny schemat walidacji (np. z `.refine`). */
  refine?: (schema: z.ZodObject<Shape>) => z.ZodTypeAny;
}

export interface Entity<Shape extends z.ZodRawShape> extends EntityDefinition<Shape> {
  /** Pełny schemat walidacji (z walidacjami międzypolowymi, jeśli podano `refine`). */
  validation: z.ZodTypeAny;
}

/**
 * Definiuje encję: czysty schemat Zod + companion-map metadanych. Jedno źródło prawdy dla
 * bazy (typ Zod → kolumna Drizzle), walidacji BE/FE, OpenAPI, kolumn admina i formularzy.
 */
export function defineEntity<Shape extends z.ZodRawShape>(
  definition: EntityDefinition<Shape>,
): Entity<Shape> {
  return {
    ...definition,
    validation: definition.refine ? definition.refine(definition.schema) : definition.schema,
  };
}
