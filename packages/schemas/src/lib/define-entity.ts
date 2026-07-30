import { z } from "zod";
import type { FieldBuilder } from "./field-builder.js";
import { isFieldBuilder, isLabelFromKey, labelFromKey } from "./field-builder.js";

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
  /**
   * Ograniczenia unikalności — każda pozycja to grupa pól unikalna łącznie
   * (`[["slug"]]` = jedno pole, `[["talkId", "speakerId"]]` = para). Scaffolder wystawia z tego
   * **częściowy** indeks unikalny (`where deleted_at is null`), a konflikt wraca jako 409.
   */
  unique?: (keyof Shape & string)[][];
}

export interface Entity<Shape extends z.ZodRawShape> extends EntityDefinition<Shape> {
  /** Pełny schemat walidacji (z walidacjami międzypolowymi, jeśli podano `refine`). */
  validation: z.ZodTypeAny;
}

/** Mapa pól zadeklarowanych builderami (`f.*`). */
export type FieldBuilderMap = Record<string, FieldBuilder>;

/** Kształt schematu wywiedziony z builderów — każde pole wnosi swój `_out`. */
export type ShapeOfBuilders<M extends FieldBuilderMap> = { [K in keyof M]: M[K]["_out"] };

/**
 * Definicja encji na builderach: `schema` nie jest podawany, bo wynika z pól. Brak `schema`
 * dyskryminuje ten wariant od surowego {@link EntityDefinition}.
 */
export interface BuilderEntityDefinition<M extends FieldBuilderMap> {
  /** Nazwa encji w liczbie pojedynczej (np. `project`). Scaffolder tworzy z niej `PascalCase`. */
  name: string;
  /** Liczba mnoga — napędza ścieżkę API (`/api/v1/<plural>`) i nazwę tabeli Drizzle. */
  plural: string;
  /** Etykieta pojedyncza (UI / detal / nagłówek formularza). */
  label: string;
  /** Etykieta mnoga (menu i tytuł listy w adminie). */
  labelPlural: string;
  /** Pole używane jako etykieta encji (np. w comboboxach relacji do niej). */
  displayField: keyof M & string;
  /** Pola encji zbudowane fabrykami `f.*`. */
  fields: M;
  /** Walidacje międzypolowe — zwraca pełny schemat walidacji (np. z `.refine`). */
  refine?: (schema: z.ZodObject<ShapeOfBuilders<M>>) => z.ZodTypeAny;
  /**
   * Unikalność **złożona** — grupy pól unikalne łącznie, np. `[["talkId", "speakerId"]]`.
   * Unikalność jednopolową deklaruj na polu (`f.text().unique()`); obie trafiają do `entity.unique`.
   */
  unique?: (keyof M & string)[][];
}

/**
 * Definiuje encję — **jedno źródło prawdy** dla bazy (typ Zod → kolumna Drizzle), walidacji BE/FE,
 * OpenAPI, kolumn admina i formularzy. Zwraca też `entity.validation` (schemat z `refine`, albo
 * `schema` gdy `refine` nieustawione), używany jako body tworzenia w API i przez silnik formularzy.
 *
 * **Domyślnie deklaruj pola builderami `f.*`** — schemat Zod i metadane powstają wtedy z jednej
 * deklaracji, więc `control` nie może rozjechać się z typem Zod. Etykieta pominięta w `.label()`
 * wywodzi się z nazwy pola (`dueDate` → „Due date", `venueId` → „Venue").
 *
 * Wariant surowy (własny `schema` + companion-map `fields`) zostaje jako **escape hatch** dla
 * kształtów, których buildery nie wyrażają; parytet kluczy `fields` ↔ schemat wymusza wtedy TS.
 *
 * Mapowanie `control` → komponent DS: `packages/forms-ui/README.md`. Pełny proces dodania encji
 * (scaffolder): `docs/recipes/jak-dodac-encje.md`.
 *
 * @example
 * export const ticketEntity = defineEntity({
 *   name: "ticket", plural: "tickets", label: "Ticket", labelPlural: "Tickets",
 *   displayField: "title",
 *   // opcjonalna walidacja MIĘDZYPOLOWA:
 *   refine: (s) => s.refine((v) => !v.dueDate || v.dueDate > new Date(), { path: ["dueDate"], message: "…" }),
 *   fields: {
 *     title: f.text().min(1).sortable().filterable(),
 *     status: f.select({ open: "Open", done: "Done" }).filterable(),
 *     dueDate: f.date().help("Opcjonalny termin").optional().sortable(),
 *   },
 * });
 */
export function defineEntity<M extends FieldBuilderMap>(
  definition: BuilderEntityDefinition<M>,
): Entity<ShapeOfBuilders<M>>;
export function defineEntity<Shape extends z.ZodRawShape>(
  definition: EntityDefinition<Shape>,
): Entity<Shape>;
export function defineEntity(
  definition: EntityDefinition<z.ZodRawShape> | BuilderEntityDefinition<FieldBuilderMap>,
): Entity<z.ZodRawShape> {
  if ("schema" in definition) {
    return {
      ...definition,
      validation: definition.refine ? definition.refine(definition.schema) : definition.schema,
    };
  }

  const shape: z.ZodRawShape = {};
  const fields: Record<string, FieldMeta> = {};
  const singleFieldUnique: string[][] = [];
  for (const [key, builder] of Object.entries(definition.fields)) {
    if (!isFieldBuilder(builder)) {
      throw new Error(
        `Pole \`${definition.name}.${key}\` nie jest builderem. Użyj fabryki \`f.*\` ` +
          `(np. \`f.text()\`) albo podaj własny \`schema\` i surowe metadane pól.`,
      );
    }
    const built = builder.build();
    shape[key] = built.zod;
    // Etykieta pominięta w builderze — wywodzimy ją z nazwy pola (nazwa jest znana dopiero tutaj).
    fields[key] = isLabelFromKey(built.meta.label)
      ? ({ ...built.meta, label: labelFromKey(key) } as FieldMeta)
      : built.meta;
    if (built.isUnique) {
      singleFieldUnique.push([key]);
    }
  }

  const schema = z.object(shape);
  const { name, plural, label, labelPlural, displayField, refine } = definition;
  // `.unique()` na polach + grupy złożone z encji; pusta lista zostaje `undefined`, żeby encje
  // bez ograniczeń miały dokładnie taki kształt jak przed wprowadzeniem `unique`.
  const unique = [...singleFieldUnique, ...(definition.unique ?? [])];
  return {
    name,
    plural,
    label,
    labelPlural,
    displayField,
    schema,
    fields,
    refine,
    ...(unique.length > 0 ? { unique } : {}),
    validation: refine ? refine(schema) : schema,
  };
}
