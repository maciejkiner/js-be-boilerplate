import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { TalkSpeakerListQuery } from "./talk-speakers.dto.js";
import { talkSpeakers } from "./talk-speakers.schema.js";

const SORT_COLUMNS = {
  orderIndex: talkSpeakers.orderIndex,
  createdAt: talkSpeakers.createdAt,
} as const;

type TalkSpeakerInsert = typeof talkSpeakers.$inferInsert;
type TalkSpeakerUpdate = Partial<Omit<TalkSpeakerInsert, "id" | "createdAt" | "updatedAt">>;

/** Data access for talkSpeakers — queries only (soft-delete aware). Generated. */
export const talkSpeakersRepository = {
  async list(db: Db, query: TalkSpeakerListQuery) {
    const conditions: SQL[] = [isNull(talkSpeakers.deletedAt)];
    if (query.talkId) {
      conditions.push(eq(talkSpeakers.talkId, query.talkId));
    }
    if (query.speakerId) {
      conditions.push(eq(talkSpeakers.speakerId, query.speakerId));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(talkSpeakers)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(talkSpeakers).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.talkSpeakers
      .findFirst({ where: and(eq(talkSpeakers.id, id), notDeleted(talkSpeakers.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: TalkSpeakerInsert) {
    const [row] = await db.insert(talkSpeakers).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: TalkSpeakerUpdate) {
    const [row] = await db
      .update(talkSpeakers)
      .set(values)
      .where(and(eq(talkSpeakers.id, id), notDeleted(talkSpeakers.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(talkSpeakers)
      .set({ deletedAt: new Date() })
      .where(and(eq(talkSpeakers.id, id), notDeleted(talkSpeakers.deletedAt)))
      .returning();
    return row;
  },
};
