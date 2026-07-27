import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Entity } from "@repo/schemas";
import * as schemas from "@repo/schemas";
import type { z } from "zod";
import { dto, drizzleSchema, repository, routes, service } from "./be-templates.js";
import { buildDescriptor, type EntityDescriptor } from "./descriptor.js";
import { insertBeforeAnchor, writeNew } from "./fs-utils.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const apiModule = (d: EntityDescriptor, file: string) =>
  join(ROOT, "apps/api/src/modules", d.plural, `${d.plural}.${file}`);

function main(): void {
  const name = process.argv[2];
  if (!name) {
    console.error("Użycie: pnpm scaffold <encja>  (np. `pnpm scaffold widget`)");
    console.error(
      "Najpierw utwórz i wyeksportuj encję w packages/schemas, potem zbuduj: pnpm --filter @repo/schemas build",
    );
    process.exit(1);
  }

  const entity = (schemas as Record<string, unknown>)[`${name}Entity`] as
    Entity<z.ZodRawShape> | undefined;
  if (!entity) {
    console.error(
      `Nie znaleziono encji \`${name}Entity\` w @repo/schemas. Dodaj plik encji, wyeksportuj go w src/index.ts i zbuduj pakiet.`,
    );
    process.exit(1);
  }

  const d = buildDescriptor(entity);
  console.log(`Scaffolding encji: ${d.name} (${d.plural})`);

  // --- BE: pliki modułu API + schemat Drizzle ---
  const files: Array<[string, string]> = [
    [apiModule(d, "schema.ts"), drizzleSchema(d)],
    [apiModule(d, "dto.ts"), dto(d)],
    [apiModule(d, "repository.ts"), repository(d)],
    [apiModule(d, "service.ts"), service(d)],
    [apiModule(d, "routes.ts"), routes(d)],
  ];
  for (const [path, content] of files) {
    writeNew(path, content);
    console.log(`  + ${path.replace(ROOT, "")}`);
  }

  // --- Rejestracja przy kotwicach (bez AST) ---
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/db/schema.ts"),
    "scaffolder:schema-export",
    `export * from "../modules/${d.plural}/${d.plural}.schema.js";`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/modules/index.ts"),
    "scaffolder:entities-import",
    `import { ${d.plural}Routes } from "./${d.plural}/${d.plural}.routes.js";`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/modules/index.ts"),
    "scaffolder:entities-register",
    `await app.register(${d.plural}Routes({ db: deps.db }), { prefix: "/${d.plural}" });`,
  );
  console.log("  ~ zarejestrowano przy kotwicach (db/schema.ts, modules/index.ts)");

  console.log("\nKroki po (uruchom ręcznie):");
  console.log("  pnpm --filter @repo/api db:generate   # migracja ze schematu");
  console.log("  pnpm generate:client                  # regeneracja klienta z OpenAPI");
}

main();
