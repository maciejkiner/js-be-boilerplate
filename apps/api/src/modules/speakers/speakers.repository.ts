import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { SpeakerListQuery } from "./speakers.dto.js";
import { speakers } from "./speakers.schema.js";

const SORT_COLUMNS = {
  fullName: speakers.fullName,
  createdAt: speakers.createdAt,
} as const;

type SpeakerInsert = typeof speakers.$inferInsert;
type SpeakerUpdate = Partial<Omit<SpeakerInsert, "id" | "createdAt" | "updatedAt">>;

/** Data access for speakers — queries only (soft-delete aware). Generated. */
export const speakersRepository = {
  async list(db: Db, query: SpeakerListQuery) {
    const conditions: SQL[] = [isNull(speakers.deletedAt)];
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(speakers)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(speakers).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.speakers
      .findFirst({ where: and(eq(speakers.id, id), notDeleted(speakers.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: SpeakerInsert) {
    const [row] = await db.insert(speakers).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: SpeakerUpdate) {
    const [row] = await db
      .update(speakers)
      .set(values)
      .where(and(eq(speakers.id, id), notDeleted(speakers.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(speakers)
      .set({ deletedAt: new Date() })
      .where(and(eq(speakers.id, id), notDeleted(speakers.deletedAt)))
      .returning();
    return row;
  },
};
