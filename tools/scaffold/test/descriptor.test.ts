import { defineEntity, f } from "@repo/schemas";
import { describe, expect, it } from "vitest";
import { buildDescriptor } from "../src/descriptor.js";

/** Encja wielowyrazowa z unikalnością złożoną — przypadek, który wcześniej rozsypywał generator. */
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
  it("encja wielowyrazowa dostaje osobną formę dla kodu, tabeli i ścieżki", () => {
    const d = buildDescriptor(talkSpeaker);

    expect(d.plural).toBe("talkSpeakers"); // identyfikatory w kodzie
    expect(d.table).toBe("talk_speakers"); // nazwa tabeli (spójna z snake_case kolumn)
    expect(d.path).toBe("talk-speakers"); // ścieżka API i admina
    expect(d.file).toBe("talk-speakers"); // katalog i nazwy plików
    expect(d.Pascal).toBe("TalkSpeaker");
    expect(d.PascalPlural).toBe("TalkSpeakers");
  });

  it("liczbę mnogą przyjmuje w dowolnym zapisie i normalizuje do tych samych form", () => {
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

  it("encja jednowyrazowa ma wszystkie formy identyczne (brak zmiany dla istniejących encji)", () => {
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

  it("odrzuca nazwę encji, która nie jest identyfikatorem camelCase", () => {
    expect(() => buildDescriptor({ ...project, name: "talk-speaker" })).toThrow(
      /musi być identyfikatorem camelCase/,
    );
  });

  it("odrzuca liczbę mnogą ze znakami spoza identyfikatora", () => {
    expect(() => buildDescriptor({ ...project, plural: "talk speakers!" })).toThrow(
      /tylko litery, cyfry i separatory/,
    );
  });
});

describe("ograniczenia unikalności", () => {
  it("grupa złożona dostaje deterministyczną nazwę indeksu", () => {
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

  it("duplikaty grup są pomijane", () => {
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

  it("encja bez unikalności ma pustą listę", () => {
    expect(buildDescriptor(project).unique).toEqual([]);
  });

  it("odrzuca `unique` wskazujące nieistniejące pole", () => {
    const broken = defineEntity({
      name: "event",
      plural: "events",
      label: "Event",
      labelPlural: "Events",
      displayField: "slug",
      unique: [["slug", "missing" as "slug"]],
      fields: { slug: f.text() },
    });

    expect(() => buildDescriptor(broken)).toThrow(/nieistniejące pole\(a\): missing/);
  });
});
