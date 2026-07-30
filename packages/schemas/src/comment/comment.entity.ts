import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const commentEntity = defineEntity({
  name: "comment",
  plural: "comments",
  label: "Comment",
  labelPlural: "Comments",
  displayField: "body",
  fields: {
    body: f.textarea().max(2000).optional().hidden(),
    status: f.select({ active: "Active", deleted: "Deleted" }).filterable(),
    taskId: f.relation("task", "title").filterable(),
    authorId: f.relation("user", "email").optional(),
  },
});
