import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const talkSpeakerEntity = defineEntity({
  name: "talkSpeaker",
  plural: "talkSpeakers",
  label: "Talk speaker",
  labelPlural: "Talk speakers",
  // Etykieta encji widziana z zewnątrz — `talkId` pokazywałby uuid.
  displayField: "role",
  unique: [["talkId", "speakerId"]],
  fields: {
    talkId: f.relation("talk", "title").filterable(),
    speakerId: f.relation("speaker", "fullName").filterable(),
    role: f.select({ speaker: "Speaker", moderator: "Moderator", panelist: "Panelist" }),
    orderIndex: f.number().int().min(0).sortable(),
  },
});
