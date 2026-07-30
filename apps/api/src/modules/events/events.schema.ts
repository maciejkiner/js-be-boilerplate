import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";
import { venues } from "../venues/venues.schema.js";

/** Tabela events — wygenerowana przez scaffolder z encji `@repo/schemas`. */
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").$type<"draft" | "published" | "cancelled">().notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    capacity: integer("capacity").notNull(),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    ...timestamps,
    ...softDelete,
    ...createdBy,
  },
  (table) => [
    uniqueIndex("events_slug_key")
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
  ],
);
