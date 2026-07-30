import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const speakerEntity = defineEntity({
  name: "speaker",
  plural: "speakers",
  label: "Speaker",
  labelPlural: "Speakers",
  displayField: "fullName",
  fields: {
    fullName: f.text().min(1).max(120).sortable().filterable(),
    email: f.text().email(),
    bio: f.textarea().max(2000).optional().hidden(),
    company: f.text().max(120).optional(),
    website: f.text().url().optional(),
    isConfirmed: f.switch().filterable(),
  },
});
