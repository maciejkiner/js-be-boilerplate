import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

/**
 * The projects table — the reference entity (model code). The column types mirror the Zod schema
 * from @repo/schemas; enums are stored as text (Zod does the validation).
 */
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // The enum is stored as text; `.$type<>()` ties the row type to the Zod enum (@repo/schemas).
  status: text("status").$type<"active" | "archived">().notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
