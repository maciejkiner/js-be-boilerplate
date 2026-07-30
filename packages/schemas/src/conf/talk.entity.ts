import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const talkEntity = defineEntity({
  name: "talk",
  plural: "talks",
  label: "Talk",
  labelPlural: "Talks",
  displayField: "title",
  refine: (schema) =>
    schema.refine((value) => value.endsAt >= value.startsAt, {
      message: "End date must be on or after the start date.",
      path: ["endsAt"],
    }),
  fields: {
    title: f.text().min(1).max(120).sortable().filterable(),
    abstract: f.textarea().max(4000).optional().hidden(),
    track: f
      .select({
        product: "Product",
        engineering: "Engineering",
        design: "Design",
        business: "Business",
      })
      .filterable(),
    level: f
      .radio({ intro: "Intro", intermediate: "Intermediate", advanced: "Advanced" })
      .filterable(),
    startsAt: f.date().sortable(),
    endsAt: f.date(),
    isRecorded: f.checkbox(),
    eventId: f.relation("event", "name").filterable(),
    roomId: f.relation("room", "name").filterable(),
  },
});
