import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

/**
 * Tabela projektów — encja referencyjna (kod wzorcowy). Typy kolumn odzwierciedlają
 * schemat Zod z @repo/schemas; enumy trzymamy jako text (walidację robi Zod).
 */
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // Enum trzymany jako text; `.$type<>()` spina typ wiersza z enumem Zod (@repo/schemas).
  status: text("status").$type<"active" | "archived">().notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
