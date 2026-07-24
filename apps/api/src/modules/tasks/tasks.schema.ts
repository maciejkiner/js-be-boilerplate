import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";
import { users } from "../auth/auth.schema.js";
import { projects } from "../projects/projects.schema.js";

/**
 * Tabela zadań. Relacje: `project_id` → projects (encja scaffoldowana, cascade),
 * `assignee_id` → users (encja core, set null przy usunięciu usera).
 */
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // Enumy trzymane jako text; `.$type<>()` spina typ wiersza z enumami Zod (@repo/schemas).
  status: text("status").$type<"todo" | "in_progress" | "done">().notNull(),
  priority: text("priority").$type<"low" | "medium" | "high">().notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  estimate: integer("estimate"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
