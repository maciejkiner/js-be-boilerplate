import { z } from "zod";
import type { FieldBuilder } from "./field-builder.js";
import { isFieldBuilder, isLabelFromKey, labelFromKey } from "./field-builder.js";

/**
 * The field type. It drives the DS component (mapped in `packages/forms-ui`) and the Drizzle column
 * type in the scaffolder. **Pair it with the matching Zod type** in the entity schema:
 * - `text` / `textarea` → `z.string()`
 * - `number` → `z.number()`
 * - `date` / `datetime` → `z.coerce.date()` (`datetime` also carries the time)
 * - `select` / `radio` → `z.enum([...])` — requires `options` in the field metadata
 * - `checkbox` / `switch` → `z.boolean()`
 * - `relation` → `z.string().uuid()` — requires `relation` in the field metadata
 */
export type FieldControl =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "radio"
  | "switch"
  | "date"
  | "datetime"
  | "relation";

export interface FieldOption {
  value: string;
  label: string;
}

export interface RelationMeta {
  /** The name of the target entity (for example "project", "user"). */
  entity: string;
  /** The target entity's field shown in the combobox and used as the label. */
  displayField: string;
}

/** The configuration of a column in the admin DataTable. */
export interface ListColumnMeta {
  /** Defaults to true. */
  visible?: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

/** Fields shared by EVERY control type. Presentation only — validation comes from Zod. */
interface FieldMetaBase {
  /** The field label (the form and the column header). */
  label: string;
  /** An optional hint rendered under the field in the form (`forms-ui`). */
  help?: string;
  /** Optional column configuration for the admin DataTable (visibility, sorting, filtering). */
  list?: ListColumnMeta;
}

/**
 * Simple fields — no extra metadata.
 * Pair with: `text`/`textarea`→`z.string()`, `number`→`z.number()`,
 * `date`/`datetime`→`z.coerce.date()`, `checkbox`/`switch`→`z.boolean()`.
 */
export interface SimpleFieldMeta extends FieldMetaBase {
  control: "text" | "textarea" | "number" | "date" | "datetime" | "checkbox" | "switch";
  options?: never;
  relation?: never;
}

/** A choice from a closed list — REQUIRES `options`. Pair with `z.enum([...])`. */
export interface ChoiceFieldMeta extends FieldMetaBase {
  control: "select" | "radio";
  options: FieldOption[];
  relation?: never;
}

/** A relation to another entity — REQUIRES `relation`. Pair with `z.string().uuid()`. */
export interface RelationFieldMeta extends FieldMetaBase {
  control: "relation";
  relation: RelationMeta;
  options?: never;
}

/**
 * Field metadata — presentation ONLY (validation comes from Zod; cross-field rules from `refine`).
 *
 * **A union discriminated by `control`** — which fields are available depends on the control type,
 * and the compiler enforces the full set (`select` without `options` is an error; `text` with
 * `options` is an error). The variants:
 * - {@link SimpleFieldMeta} — `text` `textarea` `number` `date` `datetime` `checkbox` `switch`
 * - {@link ChoiceFieldMeta} — `select` `radio` (requires `options`)
 * - {@link RelationFieldMeta} — `relation` (requires `relation`)
 *
 * Shared optional members: `help` (the hint) and `list` (the admin column) — see
 * {@link FieldMetaBase}.
 */
export type FieldMeta = SimpleFieldMeta | ChoiceFieldMeta | RelationFieldMeta;

export interface EntityDefinition<Shape extends z.ZodRawShape> {
  /** The singular entity name (for example `project`). The scaffolder derives `PascalCase` from it. */
  name: string;
  /** The plural — it drives the API path (`/api/v1/<plural>`) and the Drizzle table name. */
  plural: string;
  /** The singular label (UI, the detail page, the form heading). */
  label: string;
  /** The plural label (the admin menu and the list title). */
  labelPlural: string;
  /** The field used as the entity's label (in comboboxes of relations pointing at it). */
  displayField: keyof Shape & string;
  schema: z.ZodObject<Shape>;
  /** The metadata must cover EXACTLY the schema keys — TypeScript catches any drift. */
  fields: { [K in keyof Shape]: FieldMeta };
  /** Cross-field validation — returns the full validation schema (with `.refine`, for example). */
  refine?: (schema: z.ZodObject<Shape>) => z.ZodTypeAny;
  /**
   * Uniqueness constraints — each entry is a group of fields unique together (`[["slug"]]` is a
   * single field, `[["talkId", "speakerId"]]` a pair). The scaffolder turns each into a **partial**
   * unique index (`where deleted_at is null`), and a conflict comes back as a 409.
   */
  unique?: (keyof Shape & string)[][];
}

export interface Entity<Shape extends z.ZodRawShape> extends EntityDefinition<Shape> {
  /** The full validation schema (including cross-field rules when `refine` is given). */
  validation: z.ZodTypeAny;
}

/** A map of fields declared with the builders (`f.*`). */
export type FieldBuilderMap = Record<string, FieldBuilder>;

/** The schema shape derived from the builders — each field contributes its `_out`. */
export type ShapeOfBuilders<M extends FieldBuilderMap> = { [K in keyof M]: M[K]["_out"] };

/**
 * A builder-based entity definition: `schema` is not supplied, because it follows from the fields.
 * The absence of `schema` is what distinguishes this from the raw {@link EntityDefinition}.
 */
export interface BuilderEntityDefinition<M extends FieldBuilderMap> {
  /** The singular entity name (for example `project`). The scaffolder derives `PascalCase` from it. */
  name: string;
  /** The plural — it drives the API path (`/api/v1/<plural>`) and the Drizzle table name. */
  plural: string;
  /** The singular label (UI, the detail page, the form heading). */
  label: string;
  /** The plural label (the admin menu and the list title). */
  labelPlural: string;
  /** The field used as the entity's label (in comboboxes of relations pointing at it). */
  displayField: keyof M & string;
  /** The entity's fields, built with the `f.*` factories. */
  fields: M;
  /** Cross-field validation — returns the full validation schema (with `.refine`, for example). */
  refine?: (schema: z.ZodObject<ShapeOfBuilders<M>>) => z.ZodTypeAny;
  /**
   * **Composite** uniqueness — groups of fields unique together, `[["talkId", "speakerId"]]` say.
   * Declare single-field uniqueness on the field (`f.text().unique()`); both end up in
   * `entity.unique`.
   */
  unique?: (keyof M & string)[][];
}

/**
 * Defines an entity from fields built with the `f.*` factories — the **single source of truth** for
 * the database (Zod type → Drizzle column), backend and frontend validation, OpenAPI, admin columns
 * and forms. It also returns `entity.validation` (the schema with `refine`, or `schema` when
 * `refine` is unset), used as the create body in the API and by the form engine.
 *
 * The Zod schema and the metadata come from one declaration, so `control` cannot drift away from the
 * Zod type. A label omitted from `.label()` is derived from the field name (`dueDate` → "Due date",
 * `venueId` → "Venue").
 *
 * For shapes the builders cannot express: {@link defineEntityRaw} (the escape hatch).
 *
 * The `control` → DS component mapping: `packages/forms-ui/README.md`. The full process of adding an
 * entity (the scaffolder): `docs/recipes/how-to-add-an-entity.md`.
 *
 * @example
 * export const ticketEntity = defineEntity({
 *   name: "ticket", plural: "tickets", label: "Ticket", labelPlural: "Tickets",
 *   displayField: "title",
 *   // optional CROSS-FIELD validation:
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
): Entity<ShapeOfBuilders<M>> {
  const shape: z.ZodRawShape = {};
  const fields: Record<string, FieldMeta> = {};
  const singleFieldUnique: string[][] = [];
  for (const [key, builder] of Object.entries(definition.fields)) {
    if (!isFieldBuilder(builder)) {
      throw new Error(
        `Field \`${definition.name}.${key}\` is not a builder. Use an \`f.*\` factory ` +
          `(\`f.text()\`, say), or pass your own \`schema\` and raw field metadata to defineEntityRaw.`,
      );
    }
    const built = builder.build();
    shape[key] = built.zod;
    // The label was omitted in the builder — we derive it from the field name (only known here).
    fields[key] = isLabelFromKey(built.meta.label)
      ? ({ ...built.meta, label: labelFromKey(key) } as FieldMeta)
      : built.meta;
    if (built.isUnique) {
      singleFieldUnique.push([key]);
    }
  }

  // The schema and the metadata are assembled dynamically from the builders, so their type follows
  // from the construction rather than from inference — hence the assertions. Key parity is
  // guaranteed by the loop above (a single pass over `fields`).
  const schema = z.object(shape) as z.ZodObject<ShapeOfBuilders<M>>;
  const { name, plural, label, labelPlural, displayField, refine } = definition;
  // `.unique()` on the fields plus the composite groups from the entity; an empty list stays
  // `undefined`, so entities without constraints keep exactly the shape they had before `unique`.
  const unique = [...singleFieldUnique, ...(definition.unique ?? [])];
  return {
    name,
    plural,
    label,
    labelPlural,
    displayField,
    schema,
    fields: fields as { [K in keyof ShapeOfBuilders<M>]: FieldMeta },
    refine,
    ...(unique.length > 0 ? { unique: unique as (keyof ShapeOfBuilders<M> & string)[][] } : {}),
    validation: refine ? refine(schema) : schema,
  };
}

/**
 * Defines an entity from **your own Zod schema** plus a companion metadata map — the escape hatch for
 * shapes the `f.*` builders cannot express. TypeScript enforces key parity between `fields` and the
 * schema, but pairing `control` with the Zod type is up to you (see the table in the package README).
 *
 * {@link defineEntity} is the default path — reach for this function only when the builders are not
 * enough.
 *
 * @example
 * const shape = z.object({ title: z.string().min(1) });
 * export const ticketEntity = defineEntityRaw({
 *   name: "ticket", plural: "tickets", label: "Ticket", labelPlural: "Tickets",
 *   displayField: "title",
 *   schema: shape,
 *   fields: { title: { label: "Title", control: "text" } },
 * });
 */
export function defineEntityRaw<Shape extends z.ZodRawShape>(
  definition: EntityDefinition<Shape>,
): Entity<Shape> {
  return {
    ...definition,
    validation: definition.refine ? definition.refine(definition.schema) : definition.schema,
  };
}
