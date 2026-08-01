import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { CommentListQuery } from "./comments.dto.js";
import { comments } from "./comments.schema.js";

const SORT_COLUMNS = {
  createdAt: comments.createdAt,
} as const;

type CommentInsert = typeof comments.$inferInsert;
type CommentUpdate = Partial<Omit<CommentInsert, "id" | "createdAt" | "updatedAt">>;

/** Data access for comments — queries only (soft-delete aware). Generated. */
export const commentsRepository = {
  async list(db: Db, query: CommentListQuery) {
    const conditions: SQL[] = [isNull(comments.deletedAt)];
    if (query.status) {
      conditions.push(eq(comments.status, query.status));
    }
    if (query.taskId) {
      conditions.push(eq(comments.taskId, query.taskId));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(comments)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(comments).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.comments
      .findFirst({ where: and(eq(comments.id, id), notDeleted(comments.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: CommentInsert) {
    const [row] = await db.insert(comments).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: CommentUpdate) {
    const [row] = await db
      .update(comments)
      .set(values)
      .where(and(eq(comments.id, id), notDeleted(comments.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(and(eq(comments.id, id), notDeleted(comments.deletedAt)))
      .returning();
    return row;
  },
};
