import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { ProjectListQuery } from "./projects.dto.js";
import { projects } from "./projects.schema.js";

// Allowlista kolumn sortowania — chroni przed sortowaniem po dowolnej kolumnie.
const SORT_COLUMNS = {
  name: projects.name,
  startDate: projects.startDate,
  endDate: projects.endDate,
  createdAt: projects.createdAt,
} as const;

type ProjectInsert = typeof projects.$inferInsert;
type ProjectUpdate = Partial<Omit<ProjectInsert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych projektów. Bez logiki biznesowej — tylko zapytania (soft-delete-aware). */
export const projectsRepository = {
  async list(db: Db, query: ProjectListQuery) {
    const conditions: SQL[] = [isNull(projects.deletedAt)];
    if (query.status) {
      conditions.push(eq(projects.status, query.status));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(projects).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.projects
      .findFirst({ where: and(eq(projects.id, id), notDeleted(projects.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: ProjectInsert) {
    const [row] = await db.insert(projects).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: ProjectUpdate) {
    const [row] = await db
      .update(projects)
      .set(values)
      .where(and(eq(projects.id, id), notDeleted(projects.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, id), notDeleted(projects.deletedAt)))
      .returning();
    return row;
  },
};
