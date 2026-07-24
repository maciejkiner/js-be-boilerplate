import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { TaskListQuery } from "./tasks.dto.js";
import { tasks } from "./tasks.schema.js";

const SORT_COLUMNS = {
  dueDate: tasks.dueDate,
  title: tasks.title,
  createdAt: tasks.createdAt,
} as const;

type TaskInsert = typeof tasks.$inferInsert;
type TaskUpdate = Partial<Omit<TaskInsert, "id" | "createdAt" | "updatedAt">>;

export const tasksRepository = {
  async list(db: Db, query: TaskListQuery) {
    const conditions: SQL[] = [isNull(tasks.deletedAt)];
    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }
    if (query.priority) {
      conditions.push(eq(tasks.priority, query.priority));
    }
    if (query.projectId) {
      conditions.push(eq(tasks.projectId, query.projectId));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(tasks)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(tasks).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.tasks
      .findFirst({ where: and(eq(tasks.id, id), notDeleted(tasks.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: TaskInsert) {
    const [row] = await db.insert(tasks).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: TaskUpdate) {
    const [row] = await db
      .update(tasks)
      .set(values)
      .where(and(eq(tasks.id, id), notDeleted(tasks.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, id), notDeleted(tasks.deletedAt)))
      .returning();
    return row;
  },
};
