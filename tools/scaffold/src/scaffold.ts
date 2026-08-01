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
  join(ROOT, "apps/api/src/modules", d.file, `${d.file}.${file}`);

function main(): void {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: pnpm scaffold <entity>  (for example `pnpm scaffold widget`)");
    console.error(
      "First create the entity in packages/schemas and export it from src/index.ts (the package is built automatically).",
    );
    process.exit(1);
  }

  const entity = (schemas as Record<string, unknown>)[`${name}Entity`] as
    Entity<z.ZodRawShape> | undefined;
  if (!entity) {
    console.error(
      `Entity \`${name}Entity\` not found in @repo/schemas. Create the entity file and export it from packages/schemas/src/index.ts (the package is built automatically before scaffolding).`,
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

  // --- Backend: the API module files plus the Drizzle schema ---
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

  // --- Registration at the anchors (no AST) ---
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/db/schema.ts"),
    "scaffolder:schema-export",
    `export * from "../modules/${d.file}/${d.file}.schema.js";`,
    `../modules/${d.file}/${d.file}.schema.js`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/modules/index.ts"),
    "scaffolder:entities-import",
    `import { ${d.plural}Routes } from "./${d.file}/${d.file}.routes.js";`,
    `./${d.file}/${d.file}.routes.js`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/api/src/modules/index.ts"),
    "scaffolder:entities-register",
    `await app.register(${d.plural}Routes({ db: deps.db }), { prefix: "/${d.path}" });`,
    `${d.plural}Routes(`,
  );
  console.log("  ~ zarejestrowano przy kotwicach (db/schema.ts, modules/index.ts)");

  // --- FE: api-react hooki + widoki admina ---
  writeNew(join(ROOT, "packages/api-react/src", `${d.file}.ts`), apiReactHooks(d));
  writeNew(join(ROOT, "apps/admin/src/entities", `${d.file}.tsx`), adminEntity(d));
  writeNew(join(ROOT, "apps/api/test", `${d.file}.test.ts`), beTest(d));
  console.log(`  + packages/api-react/src/${d.file}.ts`);
  console.log(`  + apps/admin/src/entities/${d.file}.tsx`);
  console.log(`  + apps/api/test/${d.file}.test.ts`);

  insertBeforeAnchor(
    join(ROOT, "packages/api-react/src/index.ts"),
    "scaffolder:hooks-export",
    `export * from "./${d.file}.js";`,
    `"./${d.file}.js"`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/admin/src/entities/registry.ts"),
    "scaffolder:admin-import",
    `import { ${d.PascalPlural}List, ${d.Pascal}Detail, ${d.Pascal}Create, ${d.Pascal}Edit } from "./${d.file}";`,
    `from "./${d.file}"`,
  );
  insertBeforeAnchor(
    join(ROOT, "apps/admin/src/entities/registry.ts"),
    "scaffolder:admin-entities",
    `{ name: "${d.name}", label: "${d.labelPlural}", path: "/${d.path}", List: ${d.PascalPlural}List, Detail: ${d.Pascal}Detail, Create: ${d.Pascal}Create, Edit: ${d.Pascal}Edit },`,
    `name: "${d.name}"`,
  );
  console.log("  ~ zarejestrowano przy kotwicach (api-react/index.ts, admin/registry.ts)");

  // Format the generated files and the files we edited (Prettier), so they match the repo at once.
  const touched = [
    apiModule(d, "schema.ts"),
    apiModule(d, "dto.ts"),
    apiModule(d, "repository.ts"),
    apiModule(d, "service.ts"),
    apiModule(d, "routes.ts"),
    join(ROOT, "packages/api-react/src", `${d.file}.ts`),
    join(ROOT, "apps/admin/src/entities", `${d.file}.tsx`),
    join(ROOT, "apps/api/test", `${d.file}.test.ts`),
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

  console.log("\nNext steps (run these yourself):");
  console.log("  pnpm --filter @repo/api db:generate   # migracja ze schematu");
  console.log("  pnpm generate:client                  # regeneracja klienta z OpenAPI");
}

main();
