import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

/** Tabela venues — wygenerowana przez scaffolder z encji `@repo/schemas`. */
export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
