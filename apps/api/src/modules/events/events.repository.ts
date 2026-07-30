import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { EventListQuery } from "./events.dto.js";
import { events } from "./events.schema.js";

const SORT_COLUMNS = {
  name: events.name,
  startsAt: events.startsAt,
  endsAt: events.endsAt,
  createdAt: events.createdAt,
} as const;

type EventInsert = typeof events.$inferInsert;
type EventUpdate = Partial<Omit<EventInsert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych events — tylko zapytania (soft-delete-aware). Wygenerowane. */
export const eventsRepository = {
  async list(db: Db, query: EventListQuery) {
    const conditions: SQL[] = [isNull(events.deletedAt)];
    if (query.status) {
      conditions.push(eq(events.status, query.status));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(events)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(events).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.events
      .findFirst({ where: and(eq(events.id, id), notDeleted(events.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: EventInsert) {
    const [row] = await db.insert(events).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: EventUpdate) {
    const [row] = await db
      .update(events)
      .set(values)
      .where(and(eq(events.id, id), notDeleted(events.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(and(eq(events.id, id), notDeleted(events.deletedAt)))
      .returning();
    return row;
  },
};
