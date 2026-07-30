import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const eventEntity = defineEntity({
  name: "event",
  plural: "events",
  label: "Event",
  labelPlural: "Events",
  displayField: "name",
  refine: (schema) =>
    schema.refine((value) => value.endsAt >= value.startsAt, {
      message: "End date must be on or after the start date.",
      path: ["endsAt"],
    }),
  fields: {
    name: f.text().label("Name").min(1).max(200).sortable().filterable(),
    slug: f
      .text()
      .label("Slug")
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .unique(),
    description: f.textarea().label("Description").max(4000).optional().hidden(),
    startsAt: f.datetime().sortable(),
    endsAt: f.datetime().sortable(),
    status: f
      .select({ draft: "Draft", published: "Published", cancelled: "Cancelled" })
      .label("Status")
      .filterable(),
    isPublic: f.switch().label("Public"),
    capacity: f.number().int().min(1).max(100000),
    venueId: f.relation("venue", "name").optional(),
  },
});
