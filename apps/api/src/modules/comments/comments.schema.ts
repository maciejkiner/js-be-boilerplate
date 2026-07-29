import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";
import { tasks } from "../tasks/tasks.schema.js";
import { users } from "../auth/auth.schema.js";

/** Tabela comments — wygenerowana przez scaffolder z encji `@repo/schemas`. */
export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  body: text("body"),
  status: text("status").$type<"active" | "deleted">().notNull(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
