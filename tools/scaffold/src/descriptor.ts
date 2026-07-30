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
    /** Identyfikator encji-celu w kodzie (`talkSpeakers`) — nazwa stałej Drizzle i repozytorium. */
    targetIdent: string;
    /** Nazwa katalogu i plików encji-celu (`talk-speakers`). */
    targetFile: string;
    /** Nazwa tabeli encji-celu (`talk_speakers`) — do SQL-a w testach. */
    targetTable: string;
    core: boolean;
  };
  required: boolean;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
}

/** Ograniczenie unikalności przełożone na indeks w bazie. */
export interface UniqueDescriptor {
  /** Nazwa indeksu (snake_case, prefiksowana nazwą tabeli). */
  indexName: string;
  /** Pola encji (camelCase) wchodzące w ograniczenie — w kolejności deklaracji. */
  fields: string[];
}

export interface EntityDescriptor {
  name: string;
  /**
   * Liczba mnoga jako **identyfikator** w kodzie (`talkSpeakers`): nazwa stałej Drizzle,
   * repozytorium, service'u, hooków i kluczy cache.
   */
  plural: string;
  /** Nazwa tabeli w bazie (`talk_speakers`) — spójna ze snake_case kolumn. */
  table: string;
  /** Ścieżka API i admina (`talk-speakers`) — kebab-case wg konwencji z CLAUDE.md. */
  path: string;
  /** Nazwa katalogu i plików modułu (`talk-speakers`). */
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
 * Rozbija nazwę na słowa niezależnie od zapisu na wejściu:
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

/** Postgres obcina identyfikatory do 63 bajtów — obcinamy sami, żeby nazwa była przewidywalna. */
const PG_IDENTIFIER_MAX = 63;

/** Naiwna liczba mnoga (wystarcza dla konwencji encji). `user` → auth (encja core). */
function pluralize(entity: string): string {
  return entity === "user" ? "users" : `${entity}s`;
}

/**
 * Pola zarządzane przez framework — dokładane do KAŻDEJ tabeli (`id` + helpery `timestamps`/
 * `softDelete`/`createdBy` z `db/columns.ts`). Encja domenowa nie może ich deklarować, bo w
 * wygenerowanym schemacie Drizzle kolidowałyby ze spreadem helperów.
 */
const RESERVED_FIELDS = new Set(["id", "createdAt", "updatedAt", "deletedAt", "createdBy"]);

/**
 * Nazwa encji musi być poprawnym identyfikatorem camelCase, bo scaffolder składa z niej nazwę
 * eksportu w `@repo/schemas` (`<name>Entity`) oraz typy (`<Pascal>ResponseSchema`).
 */
function assertEntityName(name: string): void {
  if (!/^[a-z][A-Za-z0-9]*$/.test(name)) {
    throw new Error(
      `Nazwa encji \`${name}\` musi być identyfikatorem camelCase (np. \`talkSpeaker\`) — ` +
        `scaffolder składa z niej nazwę eksportu \`${name}Entity\` w @repo/schemas.`,
    );
  }
}

function assertPlural(plural: string, entityName: string): void {
  if (!/^[A-Za-z][A-Za-z0-9\-_]*$/.test(plural)) {
    throw new Error(
      `Liczba mnoga \`${plural}\` encji \`${entityName}\` może zawierać tylko litery, cyfry ` +
        `i separatory (\`-\`, \`_\`). Zapis dowolny: \`talkSpeakers\`, \`talk-speakers\`, \`talk_speakers\`.`,
    );
  }
}

/**
 * Przekłada `entity.unique` na indeksy: sprawdza, że pola istnieją, usuwa duplikaty grup
 * i nadaje deterministyczną nazwę indeksu.
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
        `Encja \`${entity.name}\`: \`unique\` wskazuje nieistniejące pole(a): ${unknown.join(", ")}. ` +
          `Dostępne pola: ${[...known].join(", ")}.`,
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
      `Encja \`${entity.name}\` deklaruje pole(a) audytowe: ${reserved.join(", ")}. ` +
        `Te pola (id, createdAt, updatedAt, deletedAt, createdBy) są dokładane automatycznie ` +
        `z db/columns.ts — usuń je ze schematu i metadanych encji w packages/schemas.`,
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
