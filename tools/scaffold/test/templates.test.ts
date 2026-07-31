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

// `select` i `radio` to ta sama lista zamknięta — różni je wyłącznie komponent na FE.
// Encja z OBIEMA kontrolkami pilnuje, żeby żaden szablon nie obsłużył tylko jednej z nich.
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

  it("naruszenie unikalności mapuje się na 409 z listą pól (dla formularza)", () => {
    const generated = service(talkSpeaker);

    expect(generated).toContain("uniqueConflictError");
    expect(generated).toContain("unique-violation.js");
    // Lista, nie sklejone zdanie: `uniqueConflictError` robi z niej rozszerzenie `errors`,
    // po którym formularz podświetla konkretne kontrolki.
    expect(generated).toContain('"talk_speakers_talk_id_speaker_id_key": ["talkId", "speakerId"]');
    expect(generated).toContain('uniqueConflictError("Talk speaker", fields)');
    expect(generated).toContain(".catch(rethrowAsConflict)");
  });

  it("widoki create/edit nie połykają błędu API (obsługuje go silnik formularza)", () => {
    const generated = adminEntity(talkSpeaker);

    // Własny `catch` w widoku zamieniał `detail` z problem+json na komunikat zastępczy, więc
    // użytkownik nie wiedział ani co jest nie tak, ani które pole poprawić.
    expect(generated).not.toContain("Nie udało się utworzyć.");
    expect(generated).not.toContain("Nie udało się zapisać.");
    expect(generated).toContain("const created = await create.mutateAsync(");
  });

  it("toast przy usuwaniu niesie treść z API, a nie sam tekst zastępczy", () => {
    const generated = adminEntity(talkSpeaker);

    // Usuwanie nie ma formularza, więc toast jest JEDYNYM miejscem na powód odmowy.
    expect(generated).toContain(
      'onError: (error) => toast(errorMessage(error, "Nie udało się usunąć."), "error")',
    );
    expect(generated).toContain('import { errorMessage } from "@repo/api-client";');
  });

  it("encja bez unikalności nie dostaje obsługi konfliktu", () => {
    const generated = service(project);

    expect(generated).not.toContain("uniqueConflictError");
    expect(generated).not.toContain("unique-violation");
  });

  it("TRUNCATE w teście używa nazw TABEL, nie identyfikatorów", () => {
    const generated = beTest(talkSpeaker);

    expect(generated).toContain("TRUNCATE TABLE users, talks, speakers, talk_speakers CASCADE");
    expect(generated).toContain("/api/v1/talk-speakers");
  });
});

describe("radio traktowane jak select (lista zamknięta)", () => {
  it("kolumna Drizzle dostaje `$type` i `notNull` tak samo jak select", () => {
    const generated = drizzleSchema(talk);

    expect(generated).toContain(`track: text("track").$type<"product" | "design">().notNull()`);
    expect(generated).toContain(`level: text("level").$type<"intro" | "advanced">().notNull()`);
  });

  it("filtr w DTO jest enumem, nie uuid-em", () => {
    const generated = dto(talk);

    expect(generated).toContain(`track: z.enum(["product", "design"]).optional()`);
    expect(generated).toContain(`level: z.enum(["intro", "advanced"]).optional()`);
  });

  it("test CRUD wysyła prawidłową wartość enuma, nie stub tekstowy", () => {
    const generated = beTest(talk);

    expect(generated).toContain(`level: "intro"`);
    expect(generated).not.toContain(`level: "test-level"`);
  });

  it("admin renderuje Badge i filtr dla obu kontrolek", () => {
    const generated = adminEntity(talk);

    expect(generated).toContain("<Badge>{row.track}</Badge>");
    expect(generated).toContain("<Badge>{row.level}</Badge>");
    expect(generated).toContain('aria-label="Filtr: Track"');
    expect(generated).toContain('aria-label="Filtr: Level"');
  });
});

describe("kontrolka datetime", () => {
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

  it("w bazie to ta sama kolumna co `date` (timestamptz)", () => {
    const generated = drizzleSchema(agenda);

    expect(generated).toContain(`day: timestamp("day", { withTimezone: true }).notNull()`);
    expect(generated).toContain(
      `startsAt: timestamp("starts_at", { withTimezone: true }).notNull()`,
    );
  });

  it("admin formatuje datę i datę z godziną osobnymi helperami", () => {
    const generated = adminEntity(agenda);

    expect(generated).toContain('import { formatDate, formatDateTime, Page } from "../ui";');
    expect(generated).toContain("formatDate(row.day)");
    expect(generated).toContain("formatDateTime(row.startsAt)");
  });

  it("test CRUD wysyła wartość z godziną", () => {
    expect(beTest(agenda)).toContain(`startsAt: "2026-01-01T10:00:00.000Z"`);
  });
});

describe("importy w widoku admina są warunkowe", () => {
  // Nieużywany import to błąd `noUnusedLocals` — encja bez listy zamkniętej nie może dostać
  // `Badge`, a encja bez filtrów nie może dostać `Select`.
  it("encja bez listy zamkniętej nie importuje Badge ani Select", () => {
    const generated = adminEntity(project);

    expect(generated).toContain('import { Button, Modal, useToast } from "@repo/design-system";');
  });

  it("encja z listą zamkniętą bez filtra importuje Badge, ale nie Select", () => {
    const generated = adminEntity(talkSpeaker);

    expect(generated).toContain(
      'import { Badge, Button, Modal, useToast } from "@repo/design-system";',
    );
  });

  it("encja z filtrowalną listą zamkniętą importuje oba", () => {
    const generated = adminEntity(talk);

    expect(generated).toContain(
      'import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";',
    );
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
