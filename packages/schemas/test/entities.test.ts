import { describe, expect, it } from "vitest";
import type { FieldMeta } from "../src/index.js";
import { projectEntity, taskEntity } from "../src/index.js";

describe("definicje encji", () => {
  // Type-level: the FieldMeta union enforces the extras that depend on `control`. The wrong
  // assignments below are deliberate and marked with a tsc directive; the runtime part only
  // confirms that the consts exist.
  it("FieldMeta enforces the control-dependent members (type-level)", () => {
    const simple: FieldMeta = { label: "Name", control: "text" }; // bez options/relation — OK
    const choice: FieldMeta = { label: "Status", control: "select", options: [] }; // OK
    const relation: FieldMeta = {
      label: "Project",
      control: "relation",
      relation: { entity: "project", displayField: "name" },
    }; // OK
    // @ts-expect-error a select without options is an error
    const missingOptions: FieldMeta = { label: "Status", control: "select" };
    // @ts-expect-error a relation without relation is an error
    const missingRelation: FieldMeta = { label: "Project", control: "relation" };
    // @ts-expect-error a text with options is an error (the member is not allowed for this control)
    const extraOptions: FieldMeta = { label: "Name", control: "text", options: [] };
    expect([simple, choice, relation, missingOptions, missingRelation, extraOptions]).toHaveLength(
      6,
    );
  });

  it("the fields metadata covers exactly the schema keys", () => {
    for (const entity of [projectEntity, taskEntity]) {
      const schemaKeys = Object.keys(entity.schema.shape).sort();
      const fieldKeys = Object.keys(entity.fields).sort();
      expect(fieldKeys).toEqual(schemaKeys);
    }
  });

  it("project: cross-field validation endDate ≥ startDate", () => {
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

  it("task: relation fields carry relation metadata naming the target entity", () => {
    expect(taskEntity.fields.projectId.relation).toEqual({
      entity: "project",
      displayField: "name",
    });
    expect(taskEntity.fields.assigneeId.relation?.entity).toBe("user");
  });

  it("task: the filter and sort allowlist comes from the list metadata", () => {
    const filterable = Object.entries(taskEntity.fields)
      .filter(([, meta]) => meta.list?.filterable)
      .map(([key]) => key);
    expect(filterable).toContain("status");
    expect(filterable).toContain("priority");
  });
});
