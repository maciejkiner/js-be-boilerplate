import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { Entity } from "@repo/schemas";
import * as schemas from "@repo/schemas";
import type { z } from "zod";
import { beTest, dto, drizzleSchema, repository, routes, service } from "./be-templates.js";
import { buildDescriptor, type EntityDescriptor } from "./descriptor.js";
import { adminEntity, apiReactHooks } from "./fe-templates.js";
import { insertBeforeAnchor, writeNew } from "./fs-utils.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const apiModule = (d: EntityDescriptor, file: string) =>
  join(ROOT, "apps/api/src/modules", d.plural, `${d.plural}.${file}`);

function main(): void {
  const name = process.argv[2];
  if (!name) {
    console.error("Użycie: pnpm scaffold <encja>  (np. `pnpm scaffold widget`)");
    console.error(
      "Najpierw utwórz encję w packages/schemas i wyeksportuj ją w src/index.ts (pakiet budowany jest automatycznie).",
    );
    process.exit(1);
  }

  const entity = (schemas as Record<string, unknown>)[`${name}Entity`] as
    Entity<z.ZodRawShape> | undefined;
  if (!entity) {
    console.error(
      `Nie znaleziono encji \`${name}Entity\` w @repo/schemas. Utwórz plik encji i wyeksportuj go w packages/schemas/src/index.ts (pakiet budowany jest automatycznie przed scaffoldingiem).`,
    );
    process.exit(1);
  }

  let d: EntityDescriptor;
  try {
    d = buildDescriptor(entity);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
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
    `../modules/${d.plural}/${d.plural}.schema.js`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/modules/index.ts"),
    "scaffolder:entities-import",
    `import { ${d.plural}Routes } from "./${d.plural}/${d.plural}.routes.js";`,
    `./${d.plural}/${d.plural}.routes.js`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/modules/index.ts"),
    "scaffolder:entities-register",
    `await app.register(${d.plural}Routes({ db: deps.db }), { prefix: "/${d.plural}" });`,
    `${d.plural}Routes(`,
  );
  console.log("  ~ zarejestrowano przy kotwicach (db/schema.ts, modules/index.ts)");

  // --- FE: api-react hooki + widoki admina ---
  writeNew(join(ROOT, "packages/api-react/src", `${d.plural}.ts`), apiReactHooks(d));
  writeNew(join(ROOT, "apps/admin/src/entities", `${d.plural}.tsx`), adminEntity(d));
  writeNew(join(ROOT, "apps/api/test", `${d.plural}.test.ts`), beTest(d));
  console.log(`  + packages/api-react/src/${d.plural}.ts`);
  console.log(`  + apps/admin/src/entities/${d.plural}.tsx`);
  console.log(`  + apps/api/test/${d.plural}.test.ts`);

  insertBeforeAnchor(
    join(ROOT, "packages/api-react/src/index.ts"),
    "scaffolder:hooks-export",
    `export * from "./${d.plural}.js";`,
    `"./${d.plural}.js"`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/admin/src/entities/registry.ts"),
    "scaffolder:admin-import",
    `import { ${d.PascalPlural}List, ${d.Pascal}Detail, ${d.Pascal}Create, ${d.Pascal}Edit } from "./${d.plural}";`,
    `from "./${d.plural}"`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/admin/src/entities/registry.ts"),
    "scaffolder:admin-entities",
    `{ name: "${d.name}", label: "${d.labelPlural}", path: "/${d.plural}", List: ${d.PascalPlural}List, Detail: ${d.Pascal}Detail, Create: ${d.Pascal}Create, Edit: ${d.Pascal}Edit },`,
    `name: "${d.name}"`,
  );
  console.log("  ~ zarejestrowano przy kotwicach (api-react/index.ts, admin/registry.ts)");

  // Format generowanych plików + plików z wstawkami (Prettier), by były od razu zgodne z repo.
  const touched = [
    apiModule(d, "schema.ts"),
    apiModule(d, "dto.ts"),
    apiModule(d, "repository.ts"),
    apiModule(d, "service.ts"),
    apiModule(d, "routes.ts"),
    join(ROOT, "packages/api-react/src", `${d.plural}.ts`),
    join(ROOT, "apps/admin/src/entities", `${d.plural}.tsx`),
    join(ROOT, "apps/api/test", `${d.plural}.test.ts`),
    join(ROOT, "apps/api/src/db/schema.ts"),
    join(ROOT, "apps/api/src/modules/index.ts"),
    join(ROOT, "packages/api-react/src/index.ts"),
    join(ROOT, "apps/admin/src/entities/registry.ts"),
  ];
  execSync(`pnpm exec prettier --write ${touched.map((p) => JSON.stringify(p)).join(" ")}`, {
    cwd: ROOT,
    stdio: "ignore",
  });
  console.log("  ~ sformatowano (prettier)");

  console.log("\nKroki po (uruchom ręcznie):");
  console.log("  pnpm --filter @repo/api db:generate   # migracja ze schematu");
  console.log("  pnpm generate:client                  # regeneracja klienta z OpenAPI");
}

main();
