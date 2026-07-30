import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { VenueListQuery } from "./venues.dto.js";
import { venues } from "./venues.schema.js";

const SORT_COLUMNS = {
  name: venues.name,
  city: venues.city,
  createdAt: venues.createdAt,
} as const;

type VenueInsert = typeof venues.$inferInsert;
type VenueUpdate = Partial<Omit<VenueInsert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych venues — tylko zapytania (soft-delete-aware). Wygenerowane. */
export const venuesRepository = {
  async list(db: Db, query: VenueListQuery) {
    const conditions: SQL[] = [isNull(venues.deletedAt)];
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(venues)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(venues).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.venues
      .findFirst({ where: and(eq(venues.id, id), notDeleted(venues.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: VenueInsert) {
    const [row] = await db.insert(venues).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: VenueUpdate) {
    const [row] = await db
      .update(venues)
      .set(values)
      .where(and(eq(venues.id, id), notDeleted(venues.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(venues)
      .set({ deletedAt: new Date() })
      .where(and(eq(venues.id, id), notDeleted(venues.deletedAt)))
      .returning();
    return row;
  },
};
