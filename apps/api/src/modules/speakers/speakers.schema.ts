import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

/** Tabela speakers — wygenerowana przez scaffolder z encji `@repo/schemas`. */
export const speakers = pgTable("speakers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  bio: text("bio"),
  company: text("company"),
  website: text("website"),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
