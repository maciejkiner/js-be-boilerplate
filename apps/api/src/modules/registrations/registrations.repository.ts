import { and, asc, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { notDeleted } from "../../db/query.js";
import type { RegistrationListQuery } from "./registrations.dto.js";
import { registrations } from "./registrations.schema.js";

const SORT_COLUMNS = {
  fullName: registrations.fullName,
  createdAt: registrations.createdAt,
} as const;

type RegistrationInsert = typeof registrations.$inferInsert;
type RegistrationUpdate = Partial<Omit<RegistrationInsert, "id" | "createdAt" | "updatedAt">>;

/** Dostęp do danych registrations — tylko zapytania (soft-delete-aware). Wygenerowane. */
export const registrationsRepository = {
  async list(db: Db, query: RegistrationListQuery) {
    const conditions: SQL[] = [isNull(registrations.deletedAt)];
    if (query.eventId) {
      conditions.push(eq(registrations.eventId, query.eventId));
    }
    if (query.ticketType) {
      conditions.push(eq(registrations.ticketType, query.ticketType));
    }
    if (query.status) {
      conditions.push(eq(registrations.status, query.status));
    }
    const where = and(...conditions);
    const direction = query.order === "asc" ? asc : desc;

    const [items, [totals]] = await Promise.all([
      db
        .select()
        .from(registrations)
        .where(where)
        .orderBy(direction(SORT_COLUMNS[query.sort]))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(registrations).where(where),
    ]);

    return { items, total: totals?.value ?? 0 };
  },

  findById(db: Db, id: string) {
    return db.query.registrations
      .findFirst({ where: and(eq(registrations.id, id), notDeleted(registrations.deletedAt)) })
      .execute();
  },

  async create(db: Db, values: RegistrationInsert) {
    const [row] = await db.insert(registrations).values(values).returning();
    return row!;
  },

  async update(db: Db, id: string, values: RegistrationUpdate) {
    const [row] = await db
      .update(registrations)
      .set(values)
      .where(and(eq(registrations.id, id), notDeleted(registrations.deletedAt)))
      .returning();
    return row;
  },

  async softDelete(db: Db, id: string) {
    const [row] = await db
      .update(registrations)
      .set({ deletedAt: new Date() })
      .where(and(eq(registrations.id, id), notDeleted(registrations.deletedAt)))
      .returning();
    return row;
  },
};
