import { defineEntity, f } from "@repo/schemas";
import { describe, expect, it } from "vitest";
import { buildDescriptor } from "../src/descriptor.js";

/** A multi-word entity with composite uniqueness — the case that used to break the generator. */
const talkSpeaker = defineEntity({
  name: "talkSpeaker",
  plural: "talkSpeakers",
  label: "Talk speaker",
  labelPlural: "Talk speakers",
  displayField: "role",
  unique: [["talkId", "speakerId"]],
  fields: {
    talkId: f.relation("talk", "title").filterable(),
    speakerId: f.relation("speaker", "fullName").filterable(),
    role: f.select({ speaker: "Speaker", moderator: "Moderator" }),
    orderIndex: f.number().int().nonnegative(),
  },
});

const project = defineEntity({
  name: "project",
  plural: "projects",
  label: "Project",
  labelPlural: "Projects",
  displayField: "name",
  fields: { name: f.text().min(1) },
});

describe("formy nazwy encji", () => {
  it("a multi-word entity gets a separate form for code, table and path", () => {
    const d = buildDescriptor(talkSpeaker);

    expect(d.plural).toBe("talkSpeakers"); // identyfikatory w kodzie
    expect(d.table).toBe("talk_speakers"); // the table name (consistent with the snake_case columns)
    expect(d.path).toBe("talk-speakers"); // the API and admin path
    expect(d.file).toBe("talk-speakers"); // the directory and file names
    expect(d.Pascal).toBe("TalkSpeaker");
    expect(d.PascalPlural).toBe("TalkSpeakers");
  });

  it("accepts the plural in any spelling and normalises it to the same forms", () => {
    const forms = ["talkSpeakers", "talk-speakers", "talk_speakers"].map((plural) =>
      buildDescriptor({ ...talkSpeaker, plural }),
    );

    for (const d of forms) {
      expect([d.plural, d.table, d.path]).toEqual([
        "talkSpeakers",
        "talk_speakers",
        "talk-speakers",
      ]);
    }
  });

  it("a single-word entity has all four forms identical (no change for existing entities)", () => {
    const d = buildDescriptor(project);

    expect([d.plural, d.table, d.path, d.file]).toEqual([
      "projects",
      "projects",
      "projects",
      "projects",
    ]);
  });

  it("relacja niesie formy encji-celu", () => {
    const talk = buildDescriptor(talkSpeaker).fields.find((field) => field.name === "talkId");

    expect(talk?.relation).toMatchObject({
      entity: "talk",
      targetIdent: "talks",
      targetFile: "talks",
      targetTable: "talks",
      core: false,
    });
  });

  it("rejects an entity name that is not a camelCase identifier", () => {
    expect(() => buildDescriptor({ ...project, name: "talk-speaker" })).toThrow(
      /must be a camelCase identifier/,
    );
  });

  it("rejects a plural containing characters outside an identifier", () => {
    expect(() => buildDescriptor({ ...project, plural: "talk speakers!" })).toThrow(
      /may contain only letters, digits and separators/,
    );
  });
});

describe("uniqueness constraints", () => {
  it("a composite group gets a deterministic index name", () => {
    expect(buildDescriptor(talkSpeaker).unique).toEqual([
      { indexName: "talk_speakers_talk_id_speaker_id_key", fields: ["talkId", "speakerId"] },
    ]);
  });

  it("`.unique()` na polu trafia do deskryptora jako grupa jednoelementowa", () => {
    const event = defineEntity({
      name: "event",
      plural: "events",
      label: "Event",
      labelPlural: "Events",
      displayField: "slug",
      fields: { slug: f.text().min(3).unique() },
    });

    expect(buildDescriptor(event).unique).toEqual([
      { indexName: "events_slug_key", fields: ["slug"] },
    ]);
  });

  it("duplicate groups are skipped", () => {
    const duplicated = defineEntity({
      name: "event",
      plural: "events",
      label: "Event",
      labelPlural: "Events",
      displayField: "slug",
      unique: [["slug"]],
      fields: { slug: f.text().unique() },
    });

    expect(buildDescriptor(duplicated).unique).toHaveLength(1);
  });

  it("an entity without uniqueness has an empty list", () => {
    expect(buildDescriptor(project).unique).toEqual([]);
  });

  it("rejects a `unique` naming a field that does not exist", () => {
    const broken = defineEntity({
      name: "event",
      plural: "events",
      label: "Event",
      labelPlural: "Events",
      displayField: "slug",
      unique: [["slug", "missing" as "slug"]],
      fields: { slug: f.text() },
    });

    expect(() => buildDescriptor(broken)).toThrow(/field\(s\) that do not exist: missing/);
  });
});
