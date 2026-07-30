import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { RoomListQuery } from "./rooms.dto.js";
import { rooms } from "./rooms.schema.js";

const SORT_COLUMNS = {
  name: rooms.name,
  capacity: rooms.capacity,
  createdAt: rooms.createdAt,
} as const;

type RoomInsert = typeof rooms.$inferInsert;
type RoomUpdate = Partial<Omit<RoomInsert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych rooms — tylko zapytania (soft-delete-aware). Wygenerowane. */
export const roomsRepository = {
  async list(db: Db, query: RoomListQuery) {
    const conditions: SQL[] = [isNull(rooms.deletedAt)];
    if (query.venueId) {
      conditions.push(eq(rooms.venueId, query.venueId));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(rooms)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(rooms).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.rooms
      .findFirst({ where: and(eq(rooms.id, id), notDeleted(rooms.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: RoomInsert) {
    const [row] = await db.insert(rooms).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: RoomUpdate) {
    const [row] = await db
      .update(rooms)
      .set(values)
      .where(and(eq(rooms.id, id), notDeleted(rooms.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(rooms)
      .set({ deletedAt: new Date() })
      .where(and(eq(rooms.id, id), notDeleted(rooms.deletedAt)))
      .returning();
    return row;
  },
};
