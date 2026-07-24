import { z } from "zod";
import { defineEntity } from "../lib/define-entity.js";

const projectShape = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  status: z.enum(["active", "archived"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const projectEntity = defineEntity({
  name: "project",
  plural: "projects",
  label: "Project",
  labelPlural: "Projects",
  displayField: "name",
  schema: projectShape,
  // Walidacja międzypolowa: koniec nie wcześniej niż początek.
  refine: (schema) =>
    schema.refine((value) => value.endDate >= value.startDate, {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    }),
  fields: {
    name: { label: "Name", control: "text", list: { sortable: true, filterable: true } },
    description: { label: "Description", control: "textarea", list: { visible: false } },
    status: {
      label: "Status",
      control: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
      ],
      list: { filterable: true },
    },
    startDate: { label: "Start date", control: "date", list: { sortable: true } },
    endDate: { label: "End date", control: "date", list: { sortable: true } },
  },
});
