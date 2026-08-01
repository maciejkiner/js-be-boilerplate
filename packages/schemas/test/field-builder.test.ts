import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineEntity, defineEntityRaw, f, labelFromKey } from "../src/index.js";

describe("field builders (f.*)", () => {
  it("every factory pairs its control with the right Zod type", () => {
    const cases = [
      { built: f.text().build(), control: "text", type: z.ZodString },
      { built: f.textarea().build(), control: "textarea", type: z.ZodString },
      { built: f.number().build(), control: "number", type: z.ZodNumber },
      { built: f.date().build(), control: "date", type: z.ZodDate },
      { built: f.datetime().build(), control: "datetime", type: z.ZodDate },
      { built: f.checkbox().build(), control: "checkbox", type: z.ZodBoolean },
      { built: f.switch().build(), control: "switch", type: z.ZodBoolean },
      { built: f.select({ a: "A" }).build(), control: "select", type: z.ZodEnum },
      { built: f.radio({ a: "A" }).build(), control: "radio", type: z.ZodEnum },
      { built: f.relation("venue", "name").build(), control: "relation", type: z.ZodString },
    ];

    for (const { built, control, type } of cases) {
      expect(built.meta.control).toBe(control);
      expect(built.zod).toBeInstanceOf(type);
    }
  });

  it("fields are required by default, `.optional()` makes them nullish", () => {
    expect(f.text().build().zod.isOptional()).toBe(false);

    const optional = f.text().optional().build().zod;
    expect(optional.isOptional()).toBe(true);
    expect(optional.safeParse(undefined).success).toBe(true);
    expect(optional.safeParse(null).success).toBe(true);
  });

  it("`.optional()` works regardless of its position in the chain", () => {
    const before = f.text().optional().max(5).build().zod;
    const after = f.text().max(5).optional().build().zod;

    for (const schema of [before, after]) {
      expect(schema.isOptional()).toBe(true);
      expect(schema.safeParse("ok").success).toBe(true);
      expect(schema.safeParse("too long").success).toBe(false);
    }
  });

  it("select: the map carries the enum values and options in declaration order", () => {
    const built = f.select({ todo: "To do", in_progress: "In progress", done: "Done" }).build();

    expect(built.meta.options).toEqual([
      { value: "todo", label: "To do" },
      { value: "in_progress", label: "In progress" },
      { value: "done", label: "Done" },
    ]);
    expect(built.zod.safeParse("in_progress").success).toBe(true);
    expect(built.zod.safeParse("cancelled").success).toBe(false);
  });

  it("select bez opcji jest odrzucany", () => {
    expect(() => f.select({})).toThrow(/co najmniej jednej opcji/);
  });

  it("relation: the metadata names the target entity and its label field", () => {
    const built = f.relation("venue", "name").build();

    expect(built.meta.relation).toEqual({ entity: "venue", displayField: "name" });
    expect(built.zod.safeParse("nie-uuid").success).toBe(false);
    expect(built.zod.safeParse("6f1a2f4e-6b7d-4b1e-9c2a-2f5b8d3e7a10").success).toBe(true);
  });

  it("the list flags combine into the column configuration", () => {
    expect(f.text().sortable().filterable().build().meta.list).toEqual({
      sortable: true,
      filterable: true,
    });
    expect(f.textarea().hidden().build().meta.list).toEqual({ visible: false });
  });

  it("`.zod()` applies any validation without losing the metadata", () => {
    const built = f
      .text()
      .label("Slug")
      .filterable()
      .zod((schema) => schema.regex(/^[a-z0-9-]+$/))
      .build();

    expect(built.meta.label).toBe("Slug");
    expect(built.meta.control).toBe("text");
    expect(built.meta.list).toEqual({ filterable: true });
    expect(built.zod.safeParse("moja-konferencja").success).toBe(true);
    expect(built.zod.safeParse("Moja Konferencja").success).toBe(false);
  });

  it("builders are immutable — a base definition is safe to share", () => {
    const base = f.text().label("Name");
    const extended = base.max(3);

    expect(base.build().zod.safeParse("longer").success).toBe(true);
    expect(extended.build().zod.safeParse("longer").success).toBe(false);
  });

  it("`.unique()` nie zmienia schematu ani metadanych pola", () => {
    const plain = f.text().max(80).build();
    const unique = f.text().max(80).unique().build();

    expect(unique.meta).toEqual(plain.meta);
    expect(unique.isUnique).toBe(true);
    expect(plain.isUnique).toBe(false);
    expect(unique.zod.safeParse("ok").success).toBe(true);
  });

  it("the label is derived from the field name when `.label()` is omitted", () => {
    expect(labelFromKey("fullName")).toBe("Full name");
    expect(labelFromKey("venueId")).toBe("Venue");
    expect(labelFromKey("name")).toBe("Name");

    const entity = defineEntity({
      name: "demo",
      plural: "demos",
      label: "Demo",
      labelPlural: "Demos",
      displayField: "fullName",
      fields: { fullName: f.text(), venueId: f.relation("venue", "name").label("Miejsce") },
    });

    expect(entity.fields.fullName.label).toBe("Full name");
    expect(entity.fields.venueId.label).toBe("Miejsce");
  });
});

describe("defineEntity na builderach", () => {
  // The same entity declared both ways — proof that the builder is a 1:1 lift and that consumers
  // (the scaffolder, forms-ui) cannot tell one from the other.
  const built = defineEntity({
    name: "ticket",
    plural: "tickets",
    label: "Ticket",
    labelPlural: "Tickets",
    displayField: "title",
    refine: (schema) =>
      schema.refine((value) => !value.dueDate || value.estimate != null, {
        message: "Termin wymaga oszacowania.",
        path: ["estimate"],
      }),
    fields: {
      title: f.text().label("Title").min(1).max(200).sortable().filterable(),
      status: f.select({ open: "Open", done: "Done" }).label("Status").filterable(),
      dueDate: f.date().label("Due date").optional().sortable(),
      estimate: f.number().label("Estimate").int().nonnegative().optional(),
      projectId: f.relation("project", "name").label("Project").filterable(),
    },
  });

  const shape = z.object({
    title: z.string().min(1).max(200),
    status: z.enum(["open", "done"]),
    dueDate: z.coerce.date().nullish(),
    estimate: z.number().int().nonnegative().nullish(),
    projectId: z.string().uuid(),
  });

  const manual = defineEntityRaw({
    name: "ticket",
    plural: "tickets",
    label: "Ticket",
    labelPlural: "Tickets",
    displayField: "title",
    schema: shape,
    refine: (schema) =>
      schema.refine((value) => !value.dueDate || value.estimate != null, {
        message: "Termin wymaga oszacowania.",
        path: ["estimate"],
      }),
    fields: {
      title: { label: "Title", control: "text", list: { sortable: true, filterable: true } },
      status: {
        label: "Status",
        control: "select",
        options: [
          { value: "open", label: "Open" },
          { value: "done", label: "Done" },
        ],
        list: { filterable: true },
      },
      dueDate: { label: "Due date", control: "date", list: { sortable: true } },
      estimate: { label: "Estimate", control: "number" },
      projectId: {
        label: "Project",
        control: "relation",
        relation: { entity: "project", displayField: "name" },
        list: { filterable: true },
      },
    },
  });

  it("the field metadata is identical to the hand-written declaration", () => {
    expect(built.fields).toEqual(manual.fields);
  });

  it("the schema keys and their order are identical", () => {
    expect(Object.keys(built.schema.shape)).toEqual(Object.keys(manual.schema.shape));
  });

  it("field requiredness is identical (the source of `required` for the scaffolder and forms)", () => {
    const fromBuilder: Record<string, z.ZodTypeAny> = built.schema.shape;
    for (const [key, fromManual] of Object.entries<z.ZodTypeAny>(manual.schema.shape)) {
      expect(fromBuilder[key]?.isOptional()).toBe(fromManual.isOptional());
    }
  });

  it("validation (including the cross-field refine) behaves identically", () => {
    const samples: unknown[] = [
      {
        title: "A",
        status: "open",
        projectId: "6f1a2f4e-6b7d-4b1e-9c2a-2f5b8d3e7a10",
      },
      {
        title: "",
        status: "open",
        projectId: "6f1a2f4e-6b7d-4b1e-9c2a-2f5b8d3e7a10",
      },
      {
        title: "A",
        status: "cancelled",
        projectId: "6f1a2f4e-6b7d-4b1e-9c2a-2f5b8d3e7a10",
      },
      {
        title: "A",
        status: "open",
        dueDate: "2026-01-01",
        projectId: "6f1a2f4e-6b7d-4b1e-9c2a-2f5b8d3e7a10",
      },
      {
        title: "A",
        status: "open",
        dueDate: "2026-01-01",
        estimate: 3,
        projectId: "6f1a2f4e-6b7d-4b1e-9c2a-2f5b8d3e7a10",
      },
    ];

    for (const sample of samples) {
      expect(built.validation.safeParse(sample).success).toBe(
        manual.validation.safeParse(sample).success,
      );
    }
  });

  it("the metadata covers exactly the schema keys", () => {
    expect(Object.keys(built.fields).sort()).toEqual(Object.keys(built.schema.shape).sort());
  });

  it("an entity without uniqueness gets no `unique` member (the shape it had before)", () => {
    expect("unique" in built).toBe(false);
  });
});

describe("uniqueness on the entity", () => {
  it("collects `.unique()` from the fields and the composite groups from the entity", () => {
    const entity = defineEntity({
      name: "registration",
      plural: "registrations",
      label: "Registration",
      labelPlural: "Registrations",
      displayField: "email",
      unique: [["eventId", "email"]],
      fields: {
        eventId: f.relation("event", "name"),
        email: f.text().email(),
        code: f.text().unique(),
      },
    });

    expect(entity.unique).toEqual([["code"], ["eventId", "email"]]);
  });
});
