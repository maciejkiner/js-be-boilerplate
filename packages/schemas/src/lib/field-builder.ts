import { z } from "zod";
import type { FieldMeta, FieldOption, ListColumnMeta } from "./define-entity.js";

/**
 * An unpacked builder — both sides of the same field declaration. Read by `defineEntity`.
 */
export interface BuiltField {
  zod: z.ZodTypeAny;
  meta: FieldMeta;
  /** Whether the field is unique (a single-field constraint; composite ones live on the entity). */
  isUnique: boolean;
}

/**
 * A builder for an entity field. **One declaration produces both the Zod schema and the presentation
 * metadata**, so `control` cannot drift away from the Zod type (with a hand-written `FieldMeta` that
 * invariant is guarded by the author alone — see the pairing table in the package README).
 *
 * `_out` exists only at the type level: it says what schema the field contributes to the entity
 * (taking `.optional()` into account). The property does not exist at runtime.
 */
export interface FieldBuilder<TOut extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly _out: TOut;
  build(): BuiltField;
}

/** The schema after `.optional()` is applied — `nullish()`, per the entity convention. */
type Out<TBase extends z.ZodTypeAny, Opt extends boolean> = Opt extends true
  ? z.ZodOptional<z.ZodNullable<TBase>>
  : TBase;

/** The metadata fragment shared by every control (the rest depends on `control`). */
interface MetaPatch {
  label?: string;
  help?: string;
  list?: ListColumnMeta;
}

/**
 * Spreading a discriminated union loses the narrowing by `control`, and `patch` only touches the
 * shared members — the union variant stays the same, so the assertion is safe.
 */
function patchMeta(meta: FieldMeta, patch: MetaPatch): FieldMeta {
  return { ...meta, ...patch } as FieldMeta;
}

/** The builder state. Kept in one object so the chain does not lose flags when cloning. */
interface FieldState<TBase extends z.ZodTypeAny> {
  schema: TBase;
  meta: FieldMeta;
  isOptional: boolean;
  isUnique: boolean;
}

function initialState<TBase extends z.ZodTypeAny>(
  schema: TBase,
  meta: FieldMeta,
): FieldState<TBase> {
  return { schema, meta, isOptional: false, isUnique: false };
}

/**
 * The chain shared by every control. The methods are non-mutating — each returns a new builder, so
 * field definitions can be shared and extended safely.
 */
abstract class BaseFieldBuilder<
  TBase extends z.ZodTypeAny,
  Opt extends boolean,
> implements FieldBuilder<Out<TBase, Opt>> {
  declare readonly _out: Out<TBase, Opt>;

  constructor(protected readonly state: FieldState<TBase>) {}

  /** A clone preserving the concrete builder class — the chain keeps its type-specific methods. */
  protected clone(patch: Partial<FieldState<TBase>>): this {
    const Ctor = this.constructor as new (state: FieldState<TBase>) => this;
    return new Ctor({ ...this.state, ...patch });
  }

  private patchList(patch: ListColumnMeta): this {
    return this.clone({
      meta: patchMeta(this.state.meta, { list: { ...this.state.meta.list, ...patch } }),
    });
  }

  /** The field label. Omit it and `defineEntity` derives it from the field name (`dueDate` → "Due date"). */
  label(value: string): this {
    return this.clone({ meta: patchMeta(this.state.meta, { label: value }) });
  }

  /** The hint rendered under the field by `forms-ui`. */
  help(value: string): this {
    return this.clone({ meta: patchMeta(this.state.meta, { help: value }) });
  }

  /**
   * The value is unique in the table. The scaffolder emits a **partial** unique index
   * (`where deleted_at is null`), so a soft delete releases the value; a conflict returns a 409.
   * Composite uniqueness (a pair or triple of fields) is declared on the entity through
   * `unique: [["a", "b"]]`.
   */
  unique(): this {
    return this.clone({ isUnique: true });
  }

  /** A sortable column in the admin panel (it enters the sort allowlist in the API module). */
  sortable(): this {
    return this.patchList({ sortable: true });
  }

  /** A filterable column in the admin panel (it enters the filter allowlist in the API module). */
  filterable(): this {
    return this.patchList({ filterable: true });
  }

  /** Hides the column in the admin list (the field stays in the form and on the detail page). */
  hidden(): this {
    return this.patchList({ visible: false });
  }

  /**
   * Escape hatch: any transformation of the field's Zod schema (regex, `refine`, `transform`).
   * It returns a builder without the type-specific methods — call it after the sugar
   * (`.max().zod(…)`).
   */
  zod<T2 extends z.ZodTypeAny>(refine: (schema: TBase) => T2): PlainFieldBuilder<T2, Opt> {
    return new PlainFieldBuilder({ ...this.state, schema: refine(this.state.schema) });
  }

  build(): BuiltField {
    const { schema, meta, isOptional, isUnique } = this.state;
    return { zod: isOptional ? schema.nullish() : schema, meta, isUnique };
  }
}

/** Controls with no sugar of their own: `date`, `checkbox`, `switch`, `select`, `radio`, `relation`. */
export class PlainFieldBuilder<
  TBase extends z.ZodTypeAny,
  Opt extends boolean = false,
> extends BaseFieldBuilder<TBase, Opt> {
  /** Makes the field optional (`nullish`). Position in the chain does not matter. */
  optional(): PlainFieldBuilder<TBase, true> {
    return new PlainFieldBuilder({ ...this.state, isOptional: true });
  }
}

/** `text` i `textarea` — sugar nad `z.string()`. */
export class TextFieldBuilder<Opt extends boolean = false> extends BaseFieldBuilder<
  z.ZodString,
  Opt
> {
  optional(): TextFieldBuilder<true> {
    return new TextFieldBuilder({ ...this.state, isOptional: true });
  }

  min(value: number, message?: string): this {
    return this.clone({ schema: this.state.schema.min(value, message) });
  }

  max(value: number, message?: string): this {
    return this.clone({ schema: this.state.schema.max(value, message) });
  }

  email(message?: string): this {
    return this.clone({ schema: this.state.schema.email(message) });
  }

  url(message?: string): this {
    return this.clone({ schema: this.state.schema.url(message) });
  }

  regex(pattern: RegExp, message?: string): this {
    return this.clone({ schema: this.state.schema.regex(pattern, message) });
  }
}

/** `number` — sugar nad `z.number()`. */
export class NumberFieldBuilder<Opt extends boolean = false> extends BaseFieldBuilder<
  z.ZodNumber,
  Opt
> {
  optional(): NumberFieldBuilder<true> {
    return new NumberFieldBuilder({ ...this.state, isOptional: true });
  }

  int(message?: string): this {
    return this.clone({ schema: this.state.schema.int(message) });
  }

  min(value: number, message?: string): this {
    return this.clone({ schema: this.state.schema.min(value, message) });
  }

  max(value: number, message?: string): this {
    return this.clone({ schema: this.state.schema.max(value, message) });
  }

  nonnegative(message?: string): this {
    return this.clone({ schema: this.state.schema.nonnegative(message) });
  }
}

/** The placeholder label `defineEntity` fills from the field name when `.label()` was omitted. */
const LABEL_FROM_KEY = "";

function simpleMeta(
  control: "text" | "textarea" | "number" | "date" | "datetime" | "checkbox" | "switch",
) {
  return { label: LABEL_FROM_KEY, control } satisfies FieldMeta;
}

/** A `value → label` map carries both the enum values and the control's `options`. */
function choiceValues<M extends Record<string, string>>(
  options: M,
): [keyof M & string, ...(keyof M & string)[]] {
  const values = Object.keys(options) as (keyof M & string)[];
  const [first, ...rest] = values;
  if (first === undefined) {
    throw new Error("Kontrolka select/radio wymaga co najmniej jednej opcji.");
  }
  return [first, ...rest];
}

function choiceOptions(options: Record<string, string>): FieldOption[] {
  return Object.entries(options).map(([value, label]) => ({ value, label }));
}

/**
 * The entity field factories. Typing `f.` in the editor lists every available control, and each one
 * picks the right Zod type — no need to memorise the pairing or the metadata key names.
 *
 * @example
 * fields: {
 *   name: f.text().max(200).sortable().filterable(),
 *   status: f.select({ draft: "Draft", published: "Published" }).filterable(),
 *   capacity: f.number().int().min(1),
 *   venueId: f.relation("venue", "name").label("Venue").optional(),
 * }
 */
export const f = {
  text: () => new TextFieldBuilder(initialState(z.string(), simpleMeta("text"))),
  textarea: () => new TextFieldBuilder(initialState(z.string(), simpleMeta("textarea"))),
  number: () => new NumberFieldBuilder(initialState(z.number(), simpleMeta("number"))),
  /** Sama data (bez godziny) — `<input type="date">`. */
  date: () => new PlainFieldBuilder(initialState(z.coerce.date(), simpleMeta("date"))),
  /** A date with time — `<input type="datetime-local">`; the same `timestamptz` column in the database. */
  datetime: () => new PlainFieldBuilder(initialState(z.coerce.date(), simpleMeta("datetime"))),
  checkbox: () => new PlainFieldBuilder(initialState(z.boolean(), simpleMeta("checkbox"))),
  switch: () => new PlainFieldBuilder(initialState(z.boolean(), simpleMeta("switch"))),

  /**
   * A closed list as a `value → label` map — one place instead of a separate `z.enum` and `options`.
   * The option order is the key order (do not use numeric keys: JavaScript sorts them before the
   * rest).
   */
  select: <const M extends Record<string, string>>(options: M) =>
    new PlainFieldBuilder(
      initialState(z.enum(choiceValues(options)), {
        label: LABEL_FROM_KEY,
        control: "select",
        options: choiceOptions(options),
      }),
    ),

  radio: <const M extends Record<string, string>>(options: M) =>
    new PlainFieldBuilder(
      initialState(z.enum(choiceValues(options)), {
        label: LABEL_FROM_KEY,
        control: "radio",
        options: choiceOptions(options),
      }),
    ),

  /**
   * Relacja do innej encji. `entity` = nazwa encji-celu w liczbie pojedynczej,
   * `displayField` is the target's field shown in the combobox and in the list.
   */
  relation: (entity: string, displayField: string) =>
    new PlainFieldBuilder(
      initialState(z.string().uuid(), {
        label: LABEL_FROM_KEY,
        control: "relation",
        relation: { entity, displayField },
      }),
    ),
};

/** Whether a value is a field builder (used to discriminate the `defineEntity` variants). */
export function isFieldBuilder(value: unknown): value is FieldBuilder {
  return typeof (value as FieldBuilder | undefined)?.build === "function";
}

/**
 * The default label derived from a field name: `fullName` → "Full name", `venueId` → "Venue" (the
 * relation's `Id` suffix is dropped). Entity labels are in English — see CLAUDE.md.
 */
export function labelFromKey(key: string): string {
  const withoutId = key.replace(/Id$/, "");
  const spaced = withoutId.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Whether the label still has to be filled in from the field name. */
export function isLabelFromKey(label: string): boolean {
  return label === LABEL_FROM_KEY;
}
