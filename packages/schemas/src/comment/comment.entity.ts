import { z } from "zod";
import { defineEntity } from "../lib/define-entity.js";

const commentShape = z.object({
  body: z.string().max(2000).nullish(),
  status: z.enum(["active", "deleted"]),
  taskId: z.string().uuid(),
  authorId: z.string().uuid().nullish(),
});

export const commentEntity = defineEntity({
  name: "comment",
  plural: "comments",
  label: "Comment",
  labelPlural: "Comments",
  displayField: "body",
  schema: commentShape,
  fields: {
    body: { label: "Body", control: "textarea", list: { visible: false } },
    status: {
      label: "Status",
      control: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "deleted", label: "Deleted" },
      ],
      list: { filterable: true },
    },
    taskId: {
      label: "Task",
      control: "relation",
      relation: { entity: "task", displayField: "title" },
      list: { filterable: true },
    },
    authorId: {
      label: "Author",
      control: "relation",
      relation: { entity: "user", displayField: "email" },
    },
  },
});
