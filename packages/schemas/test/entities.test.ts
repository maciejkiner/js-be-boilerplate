import { describe, expect, it } from "vitest";
import { projectEntity, taskEntity } from "../src/index.js";

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
