import { getTableColumns } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { createdBy, softDelete, timestamps } from "../src/db/columns.js";

const probe = pgTable("_probe", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});

describe("konwencja kolumn audytu / soft-delete", () => {
  it("mapuje nazwy kolumn na snake_case", () => {
    const cols = getTableColumns(probe);
    expect(cols.createdAt.name).toBe("created_at");
    expect(cols.updatedAt.name).toBe("updated_at");
    expect(cols.deletedAt.name).toBe("deleted_at");
    expect(cols.createdBy.name).toBe("created_by");
  });

  it("createdAt/updatedAt są NOT NULL, deletedAt/createdBy nullable", () => {
    const cols = getTableColumns(probe);
    expect(cols.createdAt.notNull).toBe(true);
    expect(cols.updatedAt.notNull).toBe(true);
    expect(cols.deletedAt.notNull).toBe(false);
    expect(cols.createdBy.notNull).toBe(false);
  });
});
