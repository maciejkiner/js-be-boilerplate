import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const taskEntity = defineEntity({
  name: "task",
  plural: "tasks",
  label: "Task",
  labelPlural: "Tasks",
  displayField: "title",
  // Etykiety pominięte tam, gdzie wywiodą się z nazwy pola (`dueDate` → „Due date",
  // `projectId` → „Project"); podane jawnie tylko tam, gdzie mają brzmieć inaczej.
  fields: {
    title: f.text().min(1).max(200).sortable().filterable(),
    description: f.textarea().max(2000).optional().hidden(),
    status: f.select({ todo: "To do", in_progress: "In progress", done: "Done" }).filterable(),
    priority: f.select({ low: "Low", medium: "Medium", high: "High" }).filterable(),
    dueDate: f.date().optional().sortable(),
    estimate: f.number().int().nonnegative().optional(),
    isBlocked: f.switch().label("Blocked").filterable(),
    // Relacja do encji scaffoldowanej (generator → generator).
    projectId: f.relation("project", "name").filterable(),
    // Relacja do encji core (User) — async-combobox + przecięcie z auth.
    assigneeId: f.relation("user", "email").optional(),
  },
});
