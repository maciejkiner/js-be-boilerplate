import type { Entity, FieldControl } from "@repo/schemas";
import type { z } from "zod";

export interface FieldDescriptor {
  name: string;
  snake: string;
  control: FieldControl;
  label: string;
  options?: { value: string; label: string }[];
  relation?: {
    entity: string;
    displayField: string;
    /** The target entity's code identifier (`talkSpeakers`) — the Drizzle constant and repository name. */
    targetIdent: string;
    /** The target entity's directory and file name (`talk-speakers`). */
    targetFile: string;
    /** The target entity's table name (`talk_speakers`) — for the SQL in the tests. */
    targetTable: string;
    core: boolean;
  };
  required: boolean;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  /**
   * The field's Zod schema. Templates validate the sample values they generate against it, so
   * refinements invisible in `control` (`.email()`, `.url()`, `.regex()`, lengths) are respected —
   * otherwise an entity with a format constraint gets a CRUD test that fails on its first run.
   */
  zod?: z.ZodTypeAny;
}

/** A uniqueness constraint translated into a database index. */
export interface UniqueDescriptor {
  /** The index name (snake_case, prefixed with the table name). */
  indexName: string;
  /** The entity fields (camelCase) taking part in the constraint — in declaration order. */
  fields: string[];
}

export interface EntityDescriptor {
  name: string;
  /**
   * The plural as a code **identifier** (`talkSpeakers`): the name of the Drizzle constant, the
   * repository, the service, the hooks and the cache keys.
   */
  plural: string;
  /** The database table name (`talk_speakers`) — consistent with the snake_case columns. */
  table: string;
  /** The API and admin path (`talk-speakers`) — kebab-case per the CLAUDE.md convention. */
  path: string;
  /** The module's directory and file name (`talk-speakers`). */
  file: string;
  Pascal: string;
  PascalPlural: string;
  label: string;
  labelPlural: string;
  displayField: string;
  fields: FieldDescriptor[];
  unique: UniqueDescriptor[];
}

/**
 * Splits a name into words regardless of the input spelling:
 * `talkSpeakers`, `talk-speakers`, `talk_speakers` → `["talk", "speakers"]`.
 */
function words(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s\-_]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function pascal(value: string): string {
  return words(value).map(capitalize).join("");
}

/**
 * The closed-list controls. `select` and `radio` differ **only** in the frontend component — in the
 * database, the DTOs, the filters and the admin columns they behave identically (an enum plus
 * `options`). Templates must ask through this predicate instead of comparing against `"select"`.
 */
export function isChoiceField(field: FieldDescriptor): boolean {
  return field.control === "select" || field.control === "radio";
}

function camel(value: string): string {
  return words(value)
    .map((word, index) => (index === 0 ? word : capitalize(word)))
    .join("");
}

export function camelToSnake(value: string): string {
  return words(value).join("_");
}

function kebab(value: string): string {
  return words(value).join("-");
}

/** Postgres truncates identifiers to 63 bytes — we truncate ourselves so the name is predictable. */
const PG_IDENTIFIER_MAX = 63;

/** A naive plural (enough for the entity convention). `user` → auth (a core entity). */
function pluralize(entity: string): string {
  return entity === "user" ? "users" : `${entity}s`;
}

/**
 * Framework-managed fields — added to EVERY table (`id` plus the `timestamps`/`softDelete`/
 * `createdBy` helpers from `db/columns.ts`). A domain entity must not declare them, because in the
 * generated Drizzle schema they would collide with the helper spreads.
 */
const RESERVED_FIELDS = new Set(["id", "createdAt", "updatedAt", "deletedAt", "createdBy"]);

/**
 * The entity name must be a valid camelCase identifier, because the scaffolder builds the
 * export name in `@repo/schemas` (`<name>Entity`) and the types (`<Pascal>ResponseSchema`) from it.
 */
function assertEntityName(name: string): void {
  if (!/^[a-z][A-Za-z0-9]*$/.test(name)) {
    throw new Error(
      `Entity name \`${name}\` must be a camelCase identifier (\`talkSpeaker\`, say) — the ` +
        `scaffolder builds the export name \`${name}Entity\` in @repo/schemas from it.`,
    );
  }
}

function assertPlural(plural: string, entityName: string): void {
  if (!/^[A-Za-z][A-Za-z0-9\-_]*$/.test(plural)) {
    throw new Error(
      `The plural \`${plural}\` of entity \`${entityName}\` may contain only letters, digits ` +
        `and separators (\`-\`, \`_\`). Any spelling works: \`talkSpeakers\`, \`talk-speakers\`, \`talk_speakers\`.`,
    );
  }
}

/**
 * Translates `entity.unique` into indexes: it checks that the fields exist, removes duplicate groups
 * and assigns a deterministic index name.
 */
function buildUnique(entity: Entity<z.ZodRawShape>, table: string): UniqueDescriptor[] {
  const groups = entity.unique ?? [];
  const known = new Set(Object.keys(entity.fields));
  const seen = new Set<string>();
  const out: UniqueDescriptor[] = [];

  for (const group of groups) {
    if (group.length === 0) {
      throw new Error(`Encja \`${entity.name}\`: pusta grupa w \`unique\`.`);
    }
    const unknown = group.filter((field) => !known.has(field));
    if (unknown.length > 0) {
      throw new Error(
        `Entity \`${entity.name}\`: \`unique\` names field(s) that do not exist: ${unknown.join(", ")}. ` +
          `Available fields: ${[...known].join(", ")}.`,
      );
    }
    const key = group.join(",");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const suffix = `${group.map(camelToSnake).join("_")}_key`;
    out.push({
      indexName: `${table}_${suffix}`.slice(0, PG_IDENTIFIER_MAX),
      fields: [...group],
    });
  }
  return out;
}

export function buildDescriptor(entity: Entity<z.ZodRawShape>): EntityDescriptor {
  const shape = entity.schema.shape as Record<string, z.ZodTypeAny>;

  assertEntityName(entity.name);
  assertPlural(entity.plural, entity.name);

  const reserved = Object.keys(entity.fields).filter((name) => RESERVED_FIELDS.has(name));
  if (reserved.length > 0) {
    throw new Error(
      `Entity \`${entity.name}\` declares audit field(s): ${reserved.join(", ")}. ` +
        `These fields (id, createdAt, updatedAt, deletedAt, createdBy) are added automatically ` +
        `from db/columns.ts — remove them from the entity schema and metadata in packages/schemas.`,
    );
  }

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
          targetIdent: camel(pluralize(meta.relation.entity)),
          targetFile: kebab(pluralize(meta.relation.entity)),
          targetTable: camelToSnake(pluralize(meta.relation.entity)),
          core: meta.relation.entity === "user",
        }
      : undefined,
    required: shape[name] ? !shape[name].isOptional() : true,
    zod: shape[name],
    sortable: Boolean(meta.list?.sortable),
    filterable: Boolean(meta.list?.filterable),
    visible: meta.list?.visible !== false,
  }));

  const table = camelToSnake(entity.plural);
  return {
    name: entity.name,
    plural: camel(entity.plural),
    table,
    path: kebab(entity.plural),
    file: kebab(entity.plural),
    Pascal: pascal(entity.name),
    PascalPlural: pascal(entity.plural),
    label: entity.label,
    labelPlural: entity.labelPlural,
    displayField: entity.displayField,
    fields,
    unique: buildUnique(entity, table),
  };
}
