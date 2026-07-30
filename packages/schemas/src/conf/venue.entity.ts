import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const venueEntity = defineEntity({
  name: "venue",
  plural: "venues",
  label: "Venue",
  labelPlural: "Venues",
  displayField: "name",
  fields: {
    name: f.text().label("Name").min(1).max(100).sortable().filterable(),
    city: f.text().label("City").max(80).sortable().filterable(),
    address: f.text().label("Address").max(80).optional(),
  },
});
