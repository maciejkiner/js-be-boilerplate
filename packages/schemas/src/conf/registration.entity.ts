import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const registrationEntity = defineEntity({
  name: "registration",
  plural: "registrations",
  label: "Registration",
  labelPlural: "Registrations",
  displayField: "email",
  refine: (schema) =>
    schema.refine((value) => value.acceptsTerms === true, {
      message: "Has to accept terms",
      path: ["acceptsTerms"],
    }),
  unique: [["eventId", "email"]],
  fields: {
    eventId: f.relation("event", "name").filterable(),
    fullName: f.text().min(1).max(200).sortable(),
    email: f.text().email().filterable(),
    ticketType: f
      .select({ standard: "Standard", student: "Student", speaker: "Speaker" })
      .filterable(),
    needsCatering: f.checkbox(),
    // Zgoda jest warunkiem zapisu (patrz `refine`), nie informacją do przeglądania na liście.
    acceptsTerms: f.checkbox().hidden(),
    status: f
      .select({ pending: "Pending", confirmed: "Confirmed", cancelled: "Cancelled" })
      .filterable(),
  },
});
