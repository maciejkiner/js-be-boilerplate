import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const roomEntity = defineEntity({
  name: "room",
  plural: "rooms",
  label: "Room",
  labelPlural: "Rooms",
  displayField: "name",
  fields: {
    name: f.text().min(1).max(100).sortable().filterable(),
    capacity: f.number().int().min(1).max(5000).sortable(),
    hasProjector: f.checkbox(),
    venueId: f.relation("venue", "name").filterable(),
  },
});
