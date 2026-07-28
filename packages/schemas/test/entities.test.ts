import { describe, expect, it } from "vitest";
import type { FieldMeta } from "../src/index.js";
import { projectEntity, taskEntity } from "../src/index.js";

// Type-level: unia FieldMeta wymusza dodatki zależne od `control` (sprawdzane przez `tsc`, nie runtime).
() => {
  const simple: FieldMeta = { label: "Name", control: "text" }; // bez options/relation — OK
  const choice: FieldMeta = { label: "Status", control: "select", options: [] }; // OK
  const relation: FieldMeta = {
    label: "Project",
    control: "relation",
    relation: { entity: "project", displayField: "name" },
  }; // OK
  // @ts-expect-error select bez options = błąd
  const missingOptions: FieldMeta = { label: "Status", control: "select" };
  // @ts-expect-error relation bez relation = błąd
  const missingRelation: FieldMeta = { label: "Project", control: "relation" };
  // @ts-expect-error text z options = błąd (pole niedozwolone dla tej kontrolki)
  const extraOptions: FieldMeta = { label: "Name", control: "text", options: [] };
  return [simple, choice, relation, missingOptions, missingRelation, extraOptions];
};

describe("definicje encji", () => {
  it("metadane fields pokrywają dokładnie klucze schematu", () => {
    for (const entity of [projectEntity, taskEntity]) {
      const schemaKeys = Object.keys(entity.schema.shape).sort();
      const fieldKeys = Object.keys(entity.fields).sort();
      expect(fieldKeys).toEqual(schemaKeys);
    }
  });

  it("project: walidacja międzypolowa endDate ≥ startDate", () => {
    const ok = projectEntity.validation.safeParse({
      name: "A",
      status: "active",
      startDate: "2026-01-01",
      endDate: "2026-02-01",
    });
    expect(ok.success).toBe(true);

    const bad = projectEntity.validation.safeParse({
      name: "A",
      status: "active",
      startDate: "2026-02-01",
      endDate: "2026-01-01",
    });
    expect(bad.success).toBe(false);
  });

  it("task: pola relacji mają metadane relation z encją docelową", () => {
    expect(taskEntity.fields.projectId.relation).toEqual({
      entity: "project",
      displayField: "name",
    });
    expect(taskEntity.fields.assigneeId.relation?.entity).toBe("user");
  });

  it("task: allowlista filtrów/sortów pochodzi z metadanych list", () => {
    const filterable = Object.entries(taskEntity.fields)
      .filter(([, meta]) => meta.list?.filterable)
      .map(([key]) => key);
    expect(filterable).toContain("status");
    expect(filterable).toContain("priority");
  });
});
