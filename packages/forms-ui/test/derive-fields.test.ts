import { projectEntity, taskEntity } from "@repo/schemas";
import { describe, expect, it } from "vitest";
import { deriveFields, emptyValues } from "../src/index.js";

describe("deriveFields", () => {
  it("derives the fields in schema order, with control and required (from Zod)", () => {
    const fields = deriveFields(projectEntity);
    expect(fields.map((f) => f.name)).toEqual([
      "name",
      "description",
      "status",
      "startDate",
      "endDate",
    ]);

    const name = fields.find((f) => f.name === "name")!;
    expect(name.control).toBe("text");
    expect(name.required).toBe(true);

    // description is nullish() → optional
    expect(fields.find((f) => f.name === "description")!.required).toBe(false);
    expect(fields.find((f) => f.name === "status")!.options).toHaveLength(2);
  });

  it("task: pole relacji ma control=relation + metadane relation", () => {
    const fields = deriveFields(taskEntity);
    const project = fields.find((f) => f.name === "projectId")!;
    expect(project.control).toBe("relation");
    expect(project.relation?.entity).toBe("project");
  });
});

describe("emptyValues", () => {
  it("sets sensible empty values per control type", () => {
    const values = emptyValues(taskEntity);
    expect(values.isBlocked).toBe(false); // switch
    expect(values.estimate).toBeUndefined(); // number
    expect(values.title).toBe(""); // text
  });
});
