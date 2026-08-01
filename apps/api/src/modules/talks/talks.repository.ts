import { and, asc, count, desc, eq, gt, isNull, lt, ne, type SQL } from "drizzle-orm";
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

/** Data access for talks — queries only (soft-delete aware). Generated. */
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

  /**
   * The first talk in the same room whose time overlaps the given interval.
   * The overlap condition is computed in SQL (`starts_at < :endsAt AND ends_at > :startsAt`) — strict
   * inequalities, because the intervals are closed on the left and open on the right (see
   * `talks.rules.ts`). `exceptId` excludes the row being edited so it cannot clash with itself.
   */
  findOverlappingInRoom(
    db: Db,
    params: { roomId: string; startsAt: Date; endsAt: Date; exceptId?: string },
  ) {
    const conditions = [
      eq(talks.roomId, params.roomId),
      notDeleted(talks.deletedAt),
      lt(talks.startsAt, params.endsAt),
      gt(talks.endsAt, params.startsAt),
    ];
    if (params.exceptId) {
      conditions.push(ne(talks.id, params.exceptId));
    }
    return db.query.talks.findFirst({ where: and(...conditions) }).execute();
  },

  async create(db: Db, values: TalkInsert) {
    const [row] = await db.insert(talks).values(values).returning();
    return row!;
  },

  /**
   * Inserts several talks with a SINGLE `INSERT` — atomically, without an explicit transaction:
   * either all of them land or none. The service checks the domain rules BEFORE calling this.
   */
  async createMany(db: Db, values: TalkInsert[]) {
    if (values.length === 0) {
      return [];
    }
    return db.insert(talks).values(values).returning();
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
