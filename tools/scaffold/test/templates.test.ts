import { defineEntity, f } from "@repo/schemas";
import { describe, expect, it } from "vitest";
import { beTest, drizzleSchema, repository, routes, service } from "../src/be-templates.js";
import { buildDescriptor } from "../src/descriptor.js";
import { adminEntity, apiReactHooks } from "../src/fe-templates.js";

const talkSpeaker = buildDescriptor(
  defineEntity({
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
    },
  }),
);

const project = buildDescriptor(
  defineEntity({
    name: "project",
    plural: "projects",
    label: "Project",
    labelPlural: "Projects",
    displayField: "name",
    fields: { name: f.text().min(1).sortable() },
  }),
);

describe("schemat Drizzle", () => {
  const generated = drizzleSchema(talkSpeaker);

  it("nazwa tabeli jest snake_case, a stała camelCase", () => {
    expect(generated).toContain('export const talkSpeakers = pgTable("talk_speakers"');
  });

  it("importy relacji idą do katalogów kebab-case pod nazwą stałej", () => {
    expect(generated).toContain('import { talks } from "../talks/talks.schema.js"');
    expect(generated).toContain('import { speakers } from "../speakers/speakers.schema.js"');
  });

  it("unikalność złożona to CZĘŚCIOWY indeks (soft delete zwalnia wartość)", () => {
    expect(generated).toContain('uniqueIndex("talk_speakers_talk_id_speaker_id_key")');
    expect(generated).toContain(".on(table.talkId, table.speakerId)");
    expect(generated).toContain("where(sql`${table.deletedAt} is null`)");
    expect(generated).toContain('import { sql } from "drizzle-orm"');
  });

  it("encja bez unikalności nie dostaje trzeciego argumentu ani importu `sql`", () => {
    const plain = drizzleSchema(project);

    expect(plain).toContain('export const projects = pgTable("projects", {');
    expect(plain).not.toContain("uniqueIndex");
    expect(plain).not.toContain('from "drizzle-orm"');
  });
});

describe("moduł API", () => {
  it("importy modułu wskazują pliki kebab-case", () => {
    expect(repository(talkSpeaker)).toContain('from "./talk-speakers.schema.js"');
    expect(service(talkSpeaker)).toContain('from "./talk-speakers.dto.js"');
    expect(routes(talkSpeaker)).toContain('from "./talk-speakers.service.js"');
  });

  it("repozytoria relacji importują się z katalogów kebab-case", () => {
    expect(service(talkSpeaker)).toContain(
      'import { talksRepository } from "../talks/talks.repository.js"',
    );
  });

  it("ścieżki API i tagi OpenAPI są kebab-case", () => {
    const generated = routes(talkSpeaker);

    expect(generated).toContain("/api/v1/talk-speakers");
    expect(generated).toContain('tags: ["talk-speakers"]');
    expect(generated).not.toContain("talkSpeakers}");
  });

  it("naruszenie unikalności mapuje się na 409 z nazwami pól", () => {
    const generated = service(talkSpeaker);

    expect(generated).toContain(
      'import { uniqueViolationConstraint } from "../../db/unique-violation.js"',
    );
    expect(generated).toContain('"talk_speakers_talk_id_speaker_id_key": "talkId, speakerId"');
    expect(generated).toContain("ConflictError");
    expect(generated).toContain(".catch(rethrowAsConflict)");
  });

  it("encja bez unikalności nie dostaje obsługi konfliktu", () => {
    const generated = service(project);

    expect(generated).not.toContain("ConflictError");
    expect(generated).not.toContain("unique-violation");
  });

  it("TRUNCATE w teście używa nazw TABEL, nie identyfikatorów", () => {
    const generated = beTest(talkSpeaker);

    expect(generated).toContain("TRUNCATE TABLE users, talks, speakers, talk_speakers CASCADE");
    expect(generated).toContain("/api/v1/talk-speakers");
  });
});

describe("warstwa FE", () => {
  it("hooki uderzają w kebab-case ścieżkę, ale nazwy zostają camelCase", () => {
    const generated = apiReactHooks(talkSpeaker);

    expect(generated).toContain('"/api/v1/talk-speakers/"');
    expect(generated).toContain("export const talkSpeakersKeys");
    expect(generated).toContain("export function useTalkSpeakers");
  });

  it("nawigacja admina prowadzi na kebab-case trasy", () => {
    const generated = adminEntity(talkSpeaker);

    expect(generated).toContain('to: "/talk-speakers/new"');
    expect(generated).toContain('to: "/talk-speakers/$id"');
  });
});
