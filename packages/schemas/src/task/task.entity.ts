import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const taskEntity = defineEntity({
  name: "task",
  plural: "tasks",
  label: "Task",
  labelPlural: "Tasks",
  displayField: "title",
  // Labels omitted wherever they follow from the field name (`dueDate` → "Due date",
  // `projectId` → "Project"); given explicitly only where they should read differently.
  fields: {
    title: f.text().min(1).max(200).sortable().filterable(),
    description: f.textarea().max(2000).optional().hidden(),
    status: f.select({ todo: "To do", in_progress: "In progress", done: "Done" }).filterable(),
    priority: f.select({ low: "Low", medium: "Medium", high: "High" }).filterable(),
    dueDate: f.date().optional().sortable(),
    estimate: f.number().int().nonnegative().optional(),
    isBlocked: f.switch().label("Blocked").filterable(),
    // A relation to a scaffolded entity (generated → generated).
    projectId: f.relation("project", "name").filterable(),
    // A relation to a core entity (User) — an async combobox and the intersection with auth.
    assigneeId: f.relation("user", "email").optional(),
  },
});
