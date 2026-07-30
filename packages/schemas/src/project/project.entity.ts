import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const projectEntity = defineEntity({
  name: "project",
  plural: "projects",
  label: "Project",
  labelPlural: "Projects",
  displayField: "name",
  // Walidacja międzypolowa: koniec nie wcześniej niż początek.
  refine: (schema) =>
    schema.refine((value) => value.endDate >= value.startDate, {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    }),
  // Etykiety pominięte tam, gdzie wywiodą się z nazwy pola (`startDate` → „Start date").
  fields: {
    name: f.text().min(1).max(200).sortable().filterable(),
    description: f.textarea().max(2000).optional().hidden(),
    status: f.select({ active: "Active", archived: "Archived" }).filterable(),
    startDate: f.date().sortable(),
    endDate: f.date().sortable(),
  },
});
