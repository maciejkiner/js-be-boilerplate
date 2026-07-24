import { z } from "zod";
import { defineEntity } from "../lib/define-entity.js";

const taskShape = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.coerce.date().nullish(),
  estimate: z.number().int().nonnegative().nullish(),
  isBlocked: z.boolean(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().nullish(),
});

export const taskEntity = defineEntity({
  name: "task",
  plural: "tasks",
  label: "Task",
  labelPlural: "Tasks",
  displayField: "title",
  schema: taskShape,
  fields: {
    title: { label: "Title", control: "text", list: { sortable: true, filterable: true } },
    description: { label: "Description", control: "textarea", list: { visible: false } },
    status: {
      label: "Status",
      control: "select",
      options: [
        { value: "todo", label: "To do" },
        { value: "in_progress", label: "In progress" },
        { value: "done", label: "Done" },
      ],
      list: { filterable: true },
    },
    priority: {
      label: "Priority",
      control: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
      list: { filterable: true },
    },
    dueDate: { label: "Due date", control: "date", list: { sortable: true } },
    estimate: { label: "Estimate", control: "number" },
    isBlocked: { label: "Blocked", control: "switch", list: { filterable: true } },
    // Relacja do encji scaffoldowanej (generator → generator).
    projectId: {
      label: "Project",
      control: "relation",
      relation: { entity: "project", displayField: "name" },
      list: { filterable: true },
    },
    // Relacja do encji core (User) — async-combobox + przecięcie z auth.
    assigneeId: {
      label: "Assignee",
      control: "relation",
      relation: { entity: "user", displayField: "email" },
    },
  },
});
