import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Audit columns — the convention spread into every entity's `pgTable`.
 * `updatedAt` is maintained by Drizzle on every update (`$onUpdate`), with no database triggers.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Soft delete — `null` means active, a timestamp means deleted.
 * Filter with `notDeleted(table.deletedAt)` from `query.ts`.
 */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/**
 * `createdBy` — the uuid of the user who created the row. A plain nullable uuid; the foreign key to
 * `users` is added per table where it makes sense (domain entities), not globally — the first user,
 * for instance, has no creator.
 */
export const createdBy = {
  createdBy: uuid("created_by"),
};
