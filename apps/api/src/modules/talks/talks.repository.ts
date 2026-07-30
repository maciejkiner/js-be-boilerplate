import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { TalkListQuery } from "./talks.dto.js";
import { talks } from "./talks.schema.js";

const SORT_COLUMNS = {
  title: talks.title,
  startsAt: talks.startsAt,
  createdAt: talks.createdAt,
} as const;

type TalkInsert = typeof talks.$inferInsert;
type TalkUpdate = Partial<Omit<TalkInsert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych talks — tylko zapytania (soft-delete-aware). Wygenerowane. */
export const talksRepository = {
  async list(db: Db, query: TalkListQuery) {
    const conditions: SQL[] = [isNull(talks.deletedAt)];
    if (query.track) {
      conditions.push(eq(talks.track, query.track));
    }
    if (query.level) {
      conditions.push(eq(talks.level, query.level));
    }
    if (query.eventId) {
      conditions.push(eq(talks.eventId, query.eventId));
    }
    if (query.roomId) {
      conditions.push(eq(talks.roomId, query.roomId));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(talks)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(talks).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.talks
      .findFirst({ where: and(eq(talks.id, id), notDeleted(talks.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: TalkInsert) {
    const [row] = await db.insert(talks).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: TalkUpdate) {
    const [row] = await db
      .update(talks)
      .set(values)
      .where(and(eq(talks.id, id), notDeleted(talks.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(talks)
      .set({ deletedAt: new Date() })
      .where(and(eq(talks.id, id), notDeleted(talks.deletedAt)))
      .returning();
    return row;
  },
};
