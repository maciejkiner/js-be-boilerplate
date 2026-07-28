import type { z } from "zod";

/**
 * Typ pola. Steruje komponentem DS (mapowanie w `packages/forms-ui`) oraz typem kolumny Drizzle
 * w scaffolderze. **Paruj z odpowiednim typem Zod** w schemacie encji:
 * - `text` / `textarea` → `z.string()`
 * - `number` → `z.number()`
 * - `date` → `z.coerce.date()`
 * - `select` / `radio` → `z.enum([...])` — wymaga `options` w metadanych pola
 * - `checkbox` / `switch` → `z.boolean()`
 * - `relation` → `z.string().uuid()` — wymaga `relation` w metadanych pola
 */
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

/** Pola wspólne dla KAŻDEGO typu kontrolki. Prezentacja — walidacja wynika z Zoda. */
interface FieldMetaBase {
  /** Etykieta pola (formularz + nagłówek kolumny). */
  label: string;
  /** Opcjonalna podpowiedź renderowana pod polem w formularzu (`forms-ui`). */
  help?: string;
  /** Opcjonalna konfiguracja kolumny w DataTable admina (widoczność/sort/filtr). */
  list?: ListColumnMeta;
}

/**
 * Pola proste — bez dodatkowych metadanych.
 * Paruj z: `text`/`textarea`→`z.string()`, `number`→`z.number()`, `date`→`z.coerce.date()`,
 * `checkbox`/`switch`→`z.boolean()`.
 */
export interface SimpleFieldMeta extends FieldMetaBase {
  control: "text" | "textarea" | "number" | "date" | "checkbox" | "switch";
  options?: never;
  relation?: never;
}

/** Wybór z zamkniętej listy — WYMAGA `options`. Paruj z `z.enum([...])`. */
export interface ChoiceFieldMeta extends FieldMetaBase {
  control: "select" | "radio";
  options: FieldOption[];
  relation?: never;
}

/** Relacja do innej encji — WYMAGA `relation`. Paruj z `z.string().uuid()`. */
export interface RelationFieldMeta extends FieldMetaBase {
  control: "relation";
  relation: RelationMeta;
  options?: never;
}

/**
 * Metadane pola — WYŁĄCZNIE prezentacja (walidacja wynika z Zoda; międzypolowa przez `refine`).
 *
 * **Unia dyskryminowana po `control`** — dostępne pola zależą od typu kontrolki, a kompilator
 * wymusza komplet (`select` bez `options` = błąd; `text` z `options` = błąd). Warianty:
 * - {@link SimpleFieldMeta} — `text` `textarea` `number` `date` `checkbox` `switch` (bez dodatków)
 * - {@link ChoiceFieldMeta} — `select` `radio` (wymaga `options`)
 * - {@link RelationFieldMeta} — `relation` (wymaga `relation`)
 *
 * Wspólne opcjonalne: `help` (podpowiedź) i `list` (kolumna admina) — patrz {@link FieldMetaBase}.
 */
export type FieldMeta = SimpleFieldMeta | ChoiceFieldMeta | RelationFieldMeta;

export interface EntityDefinition<Shape extends z.ZodRawShape> {
  /** Nazwa encji w liczbie pojedynczej (np. `project`). Scaffolder tworzy z niej `PascalCase`. */
  name: string;
  /** Liczba mnoga — napędza ścieżkę API (`/api/v1/<plural>`) i nazwę tabeli Drizzle. */
  plural: string;
  /** Etykieta pojedyncza (UI / detal / nagłówek formularza). */
  label: string;
  /** Etykieta mnoga (menu i tytuł listy w adminie). */
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
 * Definiuje encję: czysty schemat Zod + companion-map metadanych. **Jedno źródło prawdy** dla bazy
 * (typ Zod → kolumna Drizzle), walidacji BE/FE, OpenAPI, kolumn admina i formularzy. Parytet kluczy
 * `fields` ↔ klucze schematu wymusza TypeScript (brak metadanej dla pola = błąd kompilacji).
 *
 * Zwraca też `entity.validation` (schemat z `refine`, albo `schema` gdy `refine` nieustawione) —
 * używany jako body tworzenia w API i przez silnik formularzy.
 *
 * Mapowanie `control` → komponent DS: `packages/forms-ui/README.md`. Pełny proces dodania encji
 * (scaffolder): `docs/recipes/jak-dodac-encje.md`.
 *
 * @example
 * const shape = z.object({
 *   title: z.string().min(1),
 *   status: z.enum(["open", "done"]),
 *   dueDate: z.coerce.date().nullish(),
 * });
 * export const ticketEntity = defineEntity({
 *   name: "ticket", plural: "tickets", label: "Ticket", labelPlural: "Tickets",
 *   displayField: "title",
 *   schema: shape,
 *   // opcjonalna walidacja MIĘDZYPOLOWA:
 *   refine: (s) => s.refine((v) => !v.dueDate || v.dueDate > new Date(), { path: ["dueDate"], message: "…" }),
 *   fields: {
 *     title: { label: "Title", control: "text", list: { sortable: true, filterable: true } },
 *     status: { label: "Status", control: "select", list: { filterable: true },
 *       options: [{ value: "open", label: "Open" }, { value: "done", label: "Done" }] },
 *     dueDate: { label: "Due date", control: "date", help: "Opcjonalny termin", list: { sortable: true } },
 *   },
 * });
 */
export function defineEntity<Shape extends z.ZodRawShape>(
  definition: EntityDefinition<Shape>,
): Entity<Shape> {
  return {
    ...definition,
    validation: definition.refine ? definition.refine(definition.schema) : definition.schema,
  };
}
