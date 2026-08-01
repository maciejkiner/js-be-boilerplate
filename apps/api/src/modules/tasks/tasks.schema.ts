import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";
import { users } from "../auth/auth.schema.js";
import { projects } from "../projects/projects.schema.js";

/**
 * The tasks table. Relations: `project_id` → projects (a scaffolded entity, cascade) and
 * `assignee_id` → users (a core entity, set null when the user is removed).
 */
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  // Enums are stored as text; `.$type<>()` ties the row type to the Zod enums (@repo/schemas).
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
