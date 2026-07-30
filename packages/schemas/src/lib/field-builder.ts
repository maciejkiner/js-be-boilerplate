import { z } from "zod";
import type { FieldMeta, FieldOption, ListColumnMeta } from "./define-entity.js";

/**
 * Rozpakowany builder — strony tej samej deklaracji pola. Czyta go `defineEntity`.
 */
export interface BuiltField {
  zod: z.ZodTypeAny;
  meta: FieldMeta;
  /** Czy pole ma być unikalne (jednopolowe ograniczenie; złożone deklaruje encja). */
  isUnique: boolean;
}

/**
 * Builder pola encji. **Jedna deklaracja produkuje schemat Zod i metadane prezentacji**, więc
 * `control` nie może rozjechać się z typem Zod (przy ręcznym `FieldMeta` to inwariant pilnowany
 * wyłącznie przez człowieka — patrz tabela parowania w README pakietu).
 *
 * `_out` istnieje tylko w fazie typów: mówi, jaki schemat pole wniesie do encji (z uwzględnieniem
 * `.optional()`). W runtime tej właściwości nie ma.
 */
export interface FieldBuilder<TOut extends z.ZodTypeAny = z.ZodTypeAny> {
  readonly _out: TOut;
  build(): BuiltField;
}

/** Schemat po uwzględnieniu `.optional()` — `nullish()`, spójnie z konwencją encji. */
type Out<TBase extends z.ZodTypeAny, Opt extends boolean> = Opt extends true
  ? z.ZodOptional<z.ZodNullable<TBase>>
  : TBase;

/** Fragment metadanych wspólny dla każdej kontrolki (reszta zależy od `control`). */
interface MetaPatch {
  label?: string;
  help?: string;
  list?: ListColumnMeta;
}

/**
 * Spread na unii dyskryminowanej gubi zawężenie po `control`, a `patch` dotyka wyłącznie pól
 * wspólnych — wariant unii pozostaje ten sam, więc asercja jest bezpieczna.
 */
function patchMeta(meta: FieldMeta, patch: MetaPatch): FieldMeta {
  return { ...meta, ...patch } as FieldMeta;
}

/** Stan buildera. Trzymany w jednym obiekcie, żeby chain nie gubił flag przy klonowaniu. */
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
 * Wspólny chain każdej kontrolki. Metody są niemutujące — każda zwraca nowy builder, więc
 * definicje pól można bezpiecznie współdzielić i rozszerzać.
 */
abstract class BaseFieldBuilder<
  TBase extends z.ZodTypeAny,
  Opt extends boolean,
> implements FieldBuilder<Out<TBase, Opt>> {
  declare readonly _out: Out<TBase, Opt>;

  constructor(protected readonly state: FieldState<TBase>) {}

  /** Klon zachowujący konkretną klasę buildera — chain nie gubi metod specyficznych dla typu. */
  protected clone(patch: Partial<FieldState<TBase>>): this {
    const Ctor = this.constructor as new (state: FieldState<TBase>) => this;
    return new Ctor({ ...this.state, ...patch });
  }

  private patchList(patch: ListColumnMeta): this {
    return this.clone({
      meta: patchMeta(this.state.meta, { list: { ...this.state.meta.list, ...patch } }),
    });
  }

  /** Etykieta pola. Pominięta — `defineEntity` wywiedzie ją z nazwy pola (`dueDate` → „Due date"). */
  label(value: string): this {
    return this.clone({ meta: patchMeta(this.state.meta, { label: value }) });
  }

  /** Podpowiedź renderowana pod polem w `forms-ui`. */
  help(value: string): this {
    return this.clone({ meta: patchMeta(this.state.meta, { help: value }) });
  }

  /**
   * Wartość unikalna w tabeli. Scaffolder wystawia **częściowy** indeks unikalny
   * (`where deleted_at is null`), więc soft delete zwalnia wartość; konflikt wraca jako 409.
   * Unikalność złożoną (para/trójka pól) deklaruje encja przez `unique: [["a", "b"]]`.
   */
  unique(): this {
    return this.clone({ isUnique: true });
  }

  /** Kolumna sortowalna w adminie (wchodzi do allowlisty sortu w module API). */
  sortable(): this {
    return this.patchList({ sortable: true });
  }

  /** Kolumna filtrowalna w adminie (wchodzi do allowlisty filtrów w module API). */
  filterable(): this {
    return this.patchList({ filterable: true });
  }

  /** Ukrywa kolumnę na liście admina (pole nadal jest w formularzu i na detalu). */
  hidden(): this {
    return this.patchList({ visible: false });
  }

  /**
   * Escape hatch: dowolna transformacja schematu Zod pola (regex, `refine`, `transform`).
   * Zwraca builder bez metod specyficznych dla typu — wołaj po sugarze (`.max().zod(…)`).
   */
  zod<T2 extends z.ZodTypeAny>(refine: (schema: TBase) => T2): PlainFieldBuilder<T2, Opt> {
    return new PlainFieldBuilder({ ...this.state, schema: refine(this.state.schema) });
  }

  build(): BuiltField {
    const { schema, meta, isOptional, isUnique } = this.state;
    return { zod: isOptional ? schema.nullish() : schema, meta, isUnique };
  }
}

/** Kontrolki bez własnego sugaru: `date`, `checkbox`, `switch`, `select`, `radio`, `relation`. */
export class PlainFieldBuilder<
  TBase extends z.ZodTypeAny,
  Opt extends boolean = false,
> extends BaseFieldBuilder<TBase, Opt> {
  /** Pole opcjonalne (`nullish`). Kolejność w chainie dowolna. */
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

/** Etykieta uzupełniana przez `defineEntity` z nazwy pola, gdy `.label()` pominięto. */
const LABEL_FROM_KEY = "";

function simpleMeta(control: "text" | "textarea" | "number" | "date" | "checkbox" | "switch") {
  return { label: LABEL_FROM_KEY, control } satisfies FieldMeta;
}

/** Mapa `wartość → etykieta` niesie jednocześnie wartości enuma i `options` kontrolki. */
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
 * Fabryki pól encji. `f.` w edytorze wypisuje wszystkie dostępne kontrolki, a każda z nich
 * dobiera właściwy typ Zod — nie trzeba pamiętać parowania ani nazw kluczy metadanych.
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
  date: () => new PlainFieldBuilder(initialState(z.coerce.date(), simpleMeta("date"))),
  checkbox: () => new PlainFieldBuilder(initialState(z.boolean(), simpleMeta("checkbox"))),
  switch: () => new PlainFieldBuilder(initialState(z.boolean(), simpleMeta("switch"))),

  /**
   * Lista zamknięta jako mapa `wartość → etykieta` — jedno miejsce zamiast osobnego `z.enum`
   * i `options`. Kolejność opcji = kolejność kluczy (nie używaj kluczy numerycznych: JS
   * porządkuje je przed resztą).
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
   * `displayField` = jej pole pokazywane w comboboxie i na liście.
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

/** Czy wartość jest builderem pola (dyskryminacja wariantów `defineEntity`). */
export function isFieldBuilder(value: unknown): value is FieldBuilder {
  return typeof (value as FieldBuilder | undefined)?.build === "function";
}

/**
 * Domyślna etykieta z nazwy pola: `fullName` → „Full name", `venueId` → „Venue"
 * (sufiks `Id` relacji ucinamy). Etykiety encji są po angielsku — patrz CLAUDE.md.
 */
export function labelFromKey(key: string): string {
  const withoutId = key.replace(/Id$/, "");
  const spaced = withoutId.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Czy etykieta wymaga uzupełnienia z nazwy pola. */
export function isLabelFromKey(label: string): boolean {
  return label === LABEL_FROM_KEY;
}
