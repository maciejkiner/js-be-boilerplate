import { defineEntity, f } from "@repo/schemas";
import { describe, expect, it } from "vitest";
import { beTest, drizzleSchema, dto, repository, routes, service } from "../src/be-templates.js";
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

// `select` and `radio` are the same closed list — only the frontend component differs.
// An entity with BOTH controls guards against a template handling only one of them.
const talk = buildDescriptor(
  defineEntity({
    name: "talk",
    plural: "talks",
    label: "Talk",
    labelPlural: "Talks",
    displayField: "title",
    fields: {
      title: f.text().min(1),
      track: f.select({ product: "Product", design: "Design" }).filterable(),
      level: f.radio({ intro: "Intro", advanced: "Advanced" }).filterable(),
    },
  }),
);

describe("the Drizzle schema", () => {
  const generated = drizzleSchema(talkSpeaker);

  it("the table name is snake_case while the constant is camelCase", () => {
    expect(generated).toContain('export const talkSpeakers = pgTable("talk_speakers"');
  });

  it("relation imports point at kebab-case directories under the constant name", () => {
    expect(generated).toContain('import { talks } from "../talks/talks.schema.js"');
    expect(generated).toContain('import { speakers } from "../speakers/speakers.schema.js"');
  });

  it("composite uniqueness is a PARTIAL index (a soft delete releases the value)", () => {
    expect(generated).toContain('uniqueIndex("talk_speakers_talk_id_speaker_id_key")');
    expect(generated).toContain(".on(table.talkId, table.speakerId)");
    expect(generated).toContain("where(sql`${table.deletedAt} is null`)");
    expect(generated).toContain('import { sql } from "drizzle-orm"');
  });

  it("an entity without uniqueness gets neither the third argument nor the `sql` import", () => {
    const plain = drizzleSchema(project);

    expect(plain).toContain('export const projects = pgTable("projects", {');
    expect(plain).not.toContain("uniqueIndex");
    expect(plain).not.toContain('from "drizzle-orm"');
  });
});

describe("the API module", () => {
  it("the module imports point at kebab-case files", () => {
    expect(repository(talkSpeaker)).toContain('from "./talk-speakers.schema.js"');
    expect(service(talkSpeaker)).toContain('from "./talk-speakers.dto.js"');
    expect(routes(talkSpeaker)).toContain('from "./talk-speakers.service.js"');
  });

  it("relation repositories are imported from kebab-case directories", () => {
    expect(service(talkSpeaker)).toContain(
      'import { talksRepository } from "../talks/talks.repository.js"',
    );
  });

  it("the API paths and OpenAPI tags are kebab-case", () => {
    const generated = routes(talkSpeaker);

    expect(generated).toContain("/api/v1/talk-speakers");
    expect(generated).toContain('tags: ["talk-speakers"]');
    expect(generated).not.toContain("talkSpeakers}");
  });

  it("a uniqueness violation maps to a 409 with the field list (for the form)", () => {
    const generated = service(talkSpeaker);

    expect(generated).toContain("uniqueConflictError");
    expect(generated).toContain("unique-violation.js");
    // A list, not a glued sentence: `uniqueConflictError` turns it into the `errors` extension,
    // which is what lets the form highlight the specific controls.
    expect(generated).toContain('"talk_speakers_talk_id_speaker_id_key": ["talkId", "speakerId"]');
    expect(generated).toContain('uniqueConflictError("Talk speaker", fields)');
    expect(generated).toContain(".catch(rethrowAsConflict)");
  });

  it("the create/edit views do not swallow the API error (the form engine handles it)", () => {
    const generated = adminEntity(talkSpeaker);

    // A local `catch` in the view replaced the `detail` from problem+json with a stand-in message,
    // so the user learned neither what was wrong nor which field to fix.
    expect(generated).not.toContain("Nie udało się utworzyć.");
    expect(generated).not.toContain("Nie udało się zapisać.");
    expect(generated).toContain("const created = await create.mutateAsync(");
  });

  it("the delete toast carries the text from the API, not just a stand-in", () => {
    const generated = adminEntity(talkSpeaker);

    // Deletion has no form, so the toast is the ONLY place the reason can appear.
    expect(generated).toContain(
      'onError: (error) => toast(errorMessage(error, "Nie udało się usunąć."), "error")',
    );
    expect(generated).toContain('import { errorMessage } from "@repo/api-client";');
  });

  it("an entity without uniqueness gets no conflict handling", () => {
    const generated = service(project);

    expect(generated).not.toContain("uniqueConflictError");
    expect(generated).not.toContain("unique-violation");
  });

  it("the TRUNCATE in the test uses TABLE names, not identifiers", () => {
    const generated = beTest(talkSpeaker);

    expect(generated).toContain("TRUNCATE TABLE users, talks, speakers, talk_speakers CASCADE");
    expect(generated).toContain("/api/v1/talk-speakers");
  });
});

describe("radio treated like select (a closed list)", () => {
  it("the Drizzle column gets `$type` and `notNull` exactly as for select", () => {
    const generated = drizzleSchema(talk);

    expect(generated).toContain(`track: text("track").$type<"product" | "design">().notNull()`);
    expect(generated).toContain(`level: text("level").$type<"intro" | "advanced">().notNull()`);
  });

  it("the DTO filter is an enum, not a uuid", () => {
    const generated = dto(talk);

    expect(generated).toContain(`track: z.enum(["product", "design"]).optional()`);
    expect(generated).toContain(`level: z.enum(["intro", "advanced"]).optional()`);
  });

  it("the CRUD test satisfies validation invisible in `control` (email, url, regex)", () => {
    const speaker = buildDescriptor(
      defineEntity({
        name: "speaker",
        plural: "speakers",
        label: "Speaker",
        labelPlural: "Speakers",
        displayField: "fullName",
        fields: {
          fullName: f.text().min(1),
          email: f.text().email(),
          website: f.text().url().optional(),
          slug: f
            .text()
            .max(80)
            .zod((schema) => schema.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)),
        },
      }),
    );
    const generated = beTest(speaker);

    // The stub `"test-<field>"` is not an e-mail or a URL, so the generated test used to be rejected
    // with a 400 on the very first run. Candidates are now validated against the field schema.
    expect(generated).toContain(`fullName: "test-fullName"`);
    expect(generated).toContain(`email: "test@example.com"`);
    expect(generated).toContain(`website: "https://example.com"`);
    expect(generated).toContain(`slug: "test-slug"`); // already matches the regex
  });

  it("the CRUD test sends a valid enum value, not a text stub", () => {
    const generated = beTest(talk);

    expect(generated).toContain(`level: "intro"`);
    expect(generated).not.toContain(`level: "test-level"`);
  });

  it("the admin renders a Badge and a filter for both controls", () => {
    const generated = adminEntity(talk);

    expect(generated).toContain("<Badge>{row.track}</Badge>");
    expect(generated).toContain("<Badge>{row.level}</Badge>");
    expect(generated).toContain('aria-label="Filtr: Track"');
    expect(generated).toContain('aria-label="Filtr: Level"');
  });
});

describe("the datetime control", () => {
  const agenda = buildDescriptor(
    defineEntity({
      name: "agendaItem",
      plural: "agendaItems",
      label: "Agenda item",
      labelPlural: "Agenda items",
      displayField: "day",
      fields: {
        day: f.date().sortable(),
        startsAt: f.datetime().sortable(),
      },
    }),
  );

  it("in the database it is the same column as `date` (timestamptz)", () => {
    const generated = drizzleSchema(agenda);

    expect(generated).toContain(`day: timestamp("day", { withTimezone: true }).notNull()`);
    expect(generated).toContain(
      `startsAt: timestamp("starts_at", { withTimezone: true }).notNull()`,
    );
  });

  it("the admin formats dates and date-times with separate helpers", () => {
    const generated = adminEntity(agenda);

    expect(generated).toContain('import { formatDate, formatDateTime, Page } from "../ui";');
    expect(generated).toContain("formatDate(row.day)");
    expect(generated).toContain("formatDateTime(row.startsAt)");
  });

  it("the CRUD test sends a value including the time", () => {
    expect(beTest(agenda)).toContain(`startsAt: "2026-01-01T10:00:00.000Z"`);
  });
});

describe("the admin view imports are conditional", () => {
  // An unused import is a `noUnusedLocals` error — an entity without a closed list must not get
  // `Badge`, and an entity without filters must not get `Select`.
  it("an entity without a closed list imports neither Badge nor Select", () => {
    const generated = adminEntity(project);

    expect(generated).toContain('import { Button, Modal, useToast } from "@repo/design-system";');
  });

  it("an entity with an unfiltered closed list imports Badge but not Select", () => {
    const generated = adminEntity(talkSpeaker);

    expect(generated).toContain(
      'import { Badge, Button, Modal, useToast } from "@repo/design-system";',
    );
  });

  it("an entity with a filterable closed list imports both", () => {
    const generated = adminEntity(talk);

    expect(generated).toContain(
      'import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";',
    );
  });
});

describe("warstwa FE", () => {
  it("the hooks hit the kebab-case path while the names stay camelCase", () => {
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
