import type { EntityDescriptor, FieldDescriptor } from "./descriptor.js";

const enumUnion = (field: FieldDescriptor): string =>
  (field.options ?? []).map((o) => `"${o.value}"`).join(" | ");

const enumValues = (field: FieldDescriptor): string =>
  (field.options ?? []).map((o) => `"${o.value}"`).join(", ");

/** Pola relacji filtrowalne po równości + enumy — filtry API (jak w module referencyjnym). */
const apiFilterFields = (d: EntityDescriptor): FieldDescriptor[] =>
  d.fields.filter((f) => f.filterable && (f.control === "select" || f.control === "relation"));

const sortKeys = (d: EntityDescriptor): string[] => [
  ...d.fields.filter((f) => f.sortable).map((f) => f.name),
  "createdAt",
];

// --- Drizzle schema ---------------------------------------------------------

function drizzleColumn(f: FieldDescriptor): string {
  const notNull = f.required ? ".notNull()" : "";
  switch (f.control) {
    case "text":
    case "textarea":
      return `text("${f.snake}")${notNull}`;
    case "number":
      return `integer("${f.snake}")${notNull}`;
    case "select":
      return `text("${f.snake}").$type<${enumUnion(f)}>()${notNull}`;
    case "checkbox":
    case "switch":
      return `boolean("${f.snake}").notNull().default(false)`;
    case "date":
      return `timestamp("${f.snake}", { withTimezone: true })${notNull}`;
    case "relation":
      return `uuid("${f.snake}")${notNull}.references(() => ${f.relation!.targetPlural}.id, { onDelete: "${f.required ? "cascade" : "set null"}" })`;
    default:
      return `text("${f.snake}")`;
  }
}

export function drizzleSchema(d: EntityDescriptor): string {
  const cols = new Set<string>(["pgTable", "uuid"]);
  for (const f of d.fields) {
    if (f.control === "text" || f.control === "textarea" || f.control === "select")
      cols.add("text");
    if (f.control === "number") cols.add("integer");
    if (f.control === "checkbox" || f.control === "switch") cols.add("boolean");
    if (f.control === "date") cols.add("timestamp");
  }
  const relationImports = [
    ...new Map(
      d.fields
        .filter((f) => f.relation)
        .map((f) => [
          f.relation!.targetPlural,
          f.relation!.core
            ? `import { users } from "../auth/auth.schema.js";`
            : `import { ${f.relation!.targetPlural} } from "../${f.relation!.targetPlural}/${f.relation!.targetPlural}.schema.js";`,
        ]),
    ).values(),
  ];
  const columnLines = d.fields.map((f) => `  ${f.name}: ${drizzleColumn(f)},`).join("\n");
  return `import { ${[...cols].sort().join(", ")} } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";
${relationImports.join("\n")}${relationImports.length ? "\n" : ""}
/** Tabela ${d.plural} — wygenerowana przez scaffolder z encji \`@repo/schemas\`. */
export const ${d.plural} = pgTable("${d.plural}", {
  id: uuid("id").defaultRandom().primaryKey(),
${columnLines}
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
`;
}

// --- DTO --------------------------------------------------------------------

export function dto(d: EntityDescriptor): string {
  const filters = apiFilterFields(d)
    .map((f) => {
      const type = f.control === "select" ? `z.enum([${enumValues(f)}])` : `z.string().uuid()`;
      return `  ${f.name}: ${type}.optional(),`;
    })
    .join("\n");
  const sorts = sortKeys(d)
    .map((k) => `"${k}"`)
    .join(", ");
  return `import { ${d.name}Entity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const Create${d.Pascal}Schema = ${d.name}Entity.validation;
export const Update${d.Pascal}Schema = ${d.name}Entity.schema.partial();

export const ${d.Pascal}ResponseSchema = ${d.name}Entity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const ${d.Pascal}ListQuerySchema = PaginationQuerySchema.extend({
${filters ? `${filters}\n` : ""}  sort: z.enum([${sorts}]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const ${d.Pascal}ListResponseSchema = paginatedResponse(${d.Pascal}ResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type ${d.Pascal}ListQuery = z.infer<typeof ${d.Pascal}ListQuerySchema>;
`;
}

// --- Repository -------------------------------------------------------------

export function repository(d: EntityDescriptor): string {
  const sortCols = sortKeys(d)
    .map((k) => `  ${k}: ${d.plural}.${k},`)
    .join("\n");
  const filterConds = apiFilterFields(d)
    .map(
      (f) =>
        `    if (query.${f.name}) {\n      conditions.push(eq(${d.plural}.${f.name}, query.${f.name}));\n    }`,
    )
    .join("\n");
  return `import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { ${d.Pascal}ListQuery } from "./${d.plural}.dto.js";
import { ${d.plural} } from "./${d.plural}.schema.js";

const SORT_COLUMNS = {
${sortCols}
} as const;

type ${d.Pascal}Insert = typeof ${d.plural}.$inferInsert;
type ${d.Pascal}Update = Partial<Omit<${d.Pascal}Insert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych ${d.plural} — tylko zapytania (soft-delete-aware). Wygenerowane. */
export const ${d.plural}Repository = {
  async list(db: Db, query: ${d.Pascal}ListQuery) {
    const conditions: SQL[] = [isNull(${d.plural}.deletedAt)];
${filterConds ? `${filterConds}\n` : ""}    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(${d.plural})
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(${d.plural}).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.${d.plural}
      .findFirst({ where: and(eq(${d.plural}.id, id), notDeleted(${d.plural}.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: ${d.Pascal}Insert) {
    const [row] = await db.insert(${d.plural}).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: ${d.Pascal}Update) {
    const [row] = await db
      .update(${d.plural})
      .set(values)
      .where(and(eq(${d.plural}.id, id), notDeleted(${d.plural}.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(${d.plural})
      .set({ deletedAt: new Date() })
      .where(and(eq(${d.plural}.id, id), notDeleted(${d.plural}.deletedAt)))
      .returning();
    return row;
  },
};
`;
}

// --- Service ----------------------------------------------------------------

export function service(d: EntityDescriptor): string {
  const relations = d.fields.filter((f) => f.relation);
  const relRepoImports = [
    ...new Map(
      relations.map((f) =>
        f.relation!.core
          ? ["auth", `import { authRepository } from "../auth/auth.repository.js";`]
          : [
              f.relation!.targetPlural,
              `import { ${f.relation!.targetPlural}Repository } from "../${f.relation!.targetPlural}/${f.relation!.targetPlural}.repository.js";`,
            ],
      ),
    ).values(),
  ];
  const assertBody = relations
    .map((f) => {
      const repo = f.relation!.core
        ? `authRepository.findUserById`
        : `${f.relation!.targetPlural}Repository.findById`;
      return `  if (input.${f.name}) {
    const related = await ${repo}(db, input.${f.name});
    if (!related) {
      throw new BadRequestError("Wskazana relacja (${f.name}) nie istnieje.");
    }
  }`;
    })
    .join("\n");
  const hasRelations = relations.length > 0;
  const assertParam = `{ ${relations.map((f) => `${f.name}?: string | null`).join("; ")} }`;
  const assertFn = hasRelations
    ? `\nasync function assertRelations(db: Db, input: ${assertParam}) {\n${assertBody}\n}\n`
    : "";
  const badRequestImport = hasRelations ? "BadRequestError, " : "";
  return `import { z } from "zod";
import type { Db } from "../../db/client.js";
import { ${badRequestImport}NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type Create${d.Pascal}Schema,
  type ${d.Pascal}ListQuery,
  type Update${d.Pascal}Schema,
} from "./${d.plural}.dto.js";
${relRepoImports.join("\n")}${relRepoImports.length ? "\n" : ""}import { ${d.plural}Repository } from "./${d.plural}.repository.js";

type CreateInput = z.infer<typeof Create${d.Pascal}Schema>;
type UpdateInput = z.infer<typeof Update${d.Pascal}Schema>;
${assertFn}
/** Logika biznesowa ${d.plural}. Wygenerowane. */
export const ${d.plural}Service = {
  async list(db: Db, query: ${d.Pascal}ListQuery) {
    const { items, total } = await ${d.plural}Repository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await ${d.plural}Repository.findById(db, id);
    if (!row) {
      throw new NotFoundError("${d.label} nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
${hasRelations ? "    await assertRelations(db, input);\n" : ""}    return ${d.plural}Repository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
${hasRelations ? "    await assertRelations(db, input);\n" : ""}    const updated = await ${d.plural}Repository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("${d.label} nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await ${d.plural}Repository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("${d.label} nie istnieje.");
    }
  },
};
`;
}

// --- Test (Vitest, CRUD integracyjny) --------------------------------------

function sampleValue(f: FieldDescriptor): string {
  switch (f.control) {
    case "number":
      return "1";
    case "select":
      return `"${(f.options ?? [])[0]?.value ?? ""}"`;
    case "checkbox":
    case "switch":
      return "true";
    case "date":
      return `"2026-01-01"`;
    default:
      return `"test-${f.name}"`;
  }
}

export function beTest(d: EntityDescriptor): string {
  const requiredRelations = d.fields.filter((f) => f.relation && f.required);
  const needsProject = requiredRelations.some((f) => f.relation!.entity === "project");
  // Relacje wymagane, których scaffolder NIE potrafi automatycznie zseedować: encja docelowa
  // inna niż `project` (jedyna, której payload zna) i `user` (mamy `userId` z rejestracji).
  // Dla nich generujemy kompilowalny stub + TODO, a cały suite jest pominięty (RELATIONS_TODO) —
  // zamiast udawać przechodzący albo generować łamiący się/niekompilujący test.
  const manualRelations = requiredRelations.filter(
    (f) => f.relation!.entity !== "project" && f.relation!.entity !== "user",
  );
  const truncate = [
    ...new Set([
      "users",
      ...(needsProject ? ["projects"] : []),
      ...requiredRelations.map((f) => f.relation!.targetPlural),
      d.plural,
    ]),
  ].join(", ");

  const projectPrereq = needsProject
    ? `    const projectRes = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      cookies: auth(),
      payload: { name: "Prereq", status: "active", startDate: "2026-01-01", endDate: "2026-06-01" },
    });
    const projectId = projectRes.json().id;\n`
    : "";
  const manualPrereq = manualRelations
    .map(
      (f) =>
        `    // TODO: utwórz rekord \`${f.relation!.entity}\` (relacja wymagana) i podstaw jego id.\n    const ${f.name} = "";\n`,
    )
    .join("");
  const prereq = projectPrereq + manualPrereq;

  const relationValue = (f: FieldDescriptor): string =>
    f.relation!.entity === "project"
      ? "projectId"
      : f.relation!.entity === "user"
        ? "userId"
        : f.name;
  const bodyEntries = d.fields
    .map((f) => {
      if (f.relation) {
        if (!f.required) return null;
        const value = relationValue(f);
        // shorthand, gdy nazwa pola == nazwa zmiennej (unika object-shorthand w lincie)
        return value === f.name ? `      ${f.name},` : `      ${f.name}: ${value},`;
      }
      return `      ${f.name}: ${sampleValue(f)},`;
    })
    .filter(Boolean)
    .join("\n");

  const relationsTodo = manualRelations.length > 0;
  const todoNote = relationsTodo
    ? `\n// Scaffolder nie potrafił automatycznie zseedować relacji wymaganych: ${manualRelations
        .map((f) => f.name)
        .join(
          ", ",
        )}.\n// Uzupełnij tworzenie rekordów-prerekwizytów w create() i ustaw RELATIONS_TODO = false, aby włączyć test.\nconst RELATIONS_TODO: boolean = true;\n`
    : "";
  const skipCond = relationsTodo ? "!url || RELATIONS_TODO" : "!url";

  return `import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { buildTestApp } from "./helpers.js";

const url = process.env.TEST_DATABASE_URL;
const CREDS = { email: "${d.name}-owner@example.com", password: "password123" };
${todoNote}
/** CRUD encji ${d.plural} — wygenerowane przez scaffolder. */
describe.skipIf(${skipCond})("${d.plural} CRUD (wygenerowane)", () => {
  let app: FastifyInstance;
  let db: Db;
  let pool: Pool;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    ({ app, db, pool } = await buildTestApp());
    await runMigrations(db);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await db.execute(sql\`TRUNCATE TABLE ${truncate} CASCADE\`);
    const reg = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDS });
    userId = reg.json().user.id;
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: CREDS });
    accessToken = login.cookies.find((c) => c.name === "access_token")!.value;
  });

  const auth = () => ({ access_token: accessToken });

  async function create() {
${prereq}    return app.inject({
      method: "POST",
      url: "/api/v1/${d.plural}",
      cookies: auth(),
      payload: {
${bodyEntries}
      },
    });
  }

  it("wymaga uwierzytelnienia (401 bez cookie)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/${d.plural}" });
    expect(res.statusCode).toBe(401);
  });

  it("create zwraca 201 i ustawia createdBy z sesji", async () => {
    const res = await create();
    expect(res.statusCode).toBe(201);
    expect(res.json().createdBy).toBe(userId);
  });

  it("list zawiera utworzony rekord", async () => {
    await create();
    const res = await app.inject({ method: "GET", url: "/api/v1/${d.plural}", cookies: auth() });
    expect(res.json().meta.total).toBe(1);
  });

  it("get 404 dla nieistniejącego id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/${d.plural}/00000000-0000-0000-0000-000000000000",
      cookies: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("delete jest miękkie: po usunięciu get→404 i znika z listy", async () => {
    const created = (await create()).json();
    expect((await app.inject({ method: "DELETE", url: \`/api/v1/${d.plural}/\${created.id}\`, cookies: auth() })).statusCode).toBe(200);
    const get = await app.inject({ method: "GET", url: \`/api/v1/${d.plural}/\${created.id}\`, cookies: auth() });
    expect(get.statusCode).toBe(404);
  });
});
`;
}

// --- Routes -----------------------------------------------------------------

export function routes(d: EntityDescriptor): string {
  return `import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  Create${d.Pascal}Schema,
  IdParamSchema,
  ${d.Pascal}ListQuerySchema,
  ${d.Pascal}ListResponseSchema,
  ${d.Pascal}ResponseSchema,
  Update${d.Pascal}Schema,
} from "./${d.plural}.dto.js";
import { ${d.plural}Service } from "./${d.plural}.service.js";

/** CRUD ${d.plural} pod /api/v1/${d.plural}. Wygenerowane: trasy → service → repository; auth wymagany. */
export function ${d.plural}Routes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["${d.plural}"],
          querystring: ${d.Pascal}ListQuerySchema,
          response: { 200: ${d.Pascal}ListResponseSchema },
        },
      },
      async (request) => ${d.plural}Service.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["${d.plural}"], params: IdParamSchema, response: { 200: ${d.Pascal}ResponseSchema } },
      },
      async (request) => ${d.plural}Service.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["${d.plural}"], body: Create${d.Pascal}Schema, response: { 201: ${d.Pascal}ResponseSchema } },
      },
      async (request, reply) => {
        const row = await ${d.plural}Service.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["${d.plural}"],
          params: IdParamSchema,
          body: Update${d.Pascal}Schema,
          response: { 200: ${d.Pascal}ResponseSchema },
        },
      },
      async (request) => ${d.plural}Service.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["${d.plural}"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await ${d.plural}Service.remove(db, request.params.id);
        return { message: "${d.label} usunięty." };
      },
    );
  };
}
`;
}
