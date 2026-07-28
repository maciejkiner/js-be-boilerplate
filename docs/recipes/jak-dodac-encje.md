# Przepis: jak dodać encję (slice BE)

Krok po kroku, jak dodać kompletną encję domenową: **jedno źródło prawdy** (schemat Zod +
metadane) → tabela Drizzle → migracja → CRUD (paginacja/filtry/sort/soft delete) → OpenAPI.

Encje referencyjne (kod wzorcowy pisany ręcznie): **`Project`** i **`Task`**. Sekcje 1–6 opisują
proces, który **uogólnia scaffolder** (Faza 8) — to ten sam proces, generator i przepis się nie rozjeżdżają.

> Konwencja nazw: encja pojedyncza (`project`), ścieżka/tabela w liczbie mnogiej (`projects`),
> pliki `apps/api/src/modules/<plural>/<plural>.{schema,dto,repository,service,routes}.ts`.

## Szybka ścieżka: scaffolder (zalecane)

```bash
# 1. Napisz encję (jedyne źródło prawdy) + wyeksportuj w packages/schemas/src/index.ts.
# 2. Wygeneruj Drizzle + moduł API + hooki api-react + widoki admina + test CRUD
#    (pakiet @repo/schemas budowany jest automatycznie przed generacją):
pnpm scaffold <name>                    # np. pnpm scaffold invoice
# 3. Kroki po:
pnpm --filter @repo/api db:generate     # migracja
pnpm generate:client                    # klient z OpenAPI
```

Generator czyta encję z `@repo/schemas` i rejestruje warstwy przy kotwicach (bez AST). Szczegóły i
ograniczenia: `tools/scaffold/README.md`. Poniżej opis **co dokładnie** powstaje (i jak zrobić to
ręcznie / dostosować).

## 1. Schemat + metadane w `packages/schemas`

Encja = **czysty schemat Zod** (kształt + walidacja, w tym międzypolowa) **+ companion-map
metadanych** (wyłącznie prezentacja). Parytet kluczy `fields` ↔ schemat wymusza TypeScript —
dodasz pole do schematu bez metadanej i kod się nie skompiluje.

> **Nie deklaruj pól audytowych** (`id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`) — są
> dokładane automatycznie do każdej tabeli z `apps/api/src/db/columns.ts`. Scaffolder odrzuci encję,
> która je zawiera (kolidowałyby ze spreadem helperów w schemacie Drizzle).

```ts
// packages/schemas/src/project/project.entity.ts
import { z } from "zod";
import { defineEntity } from "../lib/define-entity.js";

const projectShape = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  status: z.enum(["active", "archived"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const projectEntity = defineEntity({
  name: "project",
  plural: "projects",
  label: "Project",
  labelPlural: "Projects",
  displayField: "name", // pole-etykieta w comboboxach relacji do tej encji
  schema: projectShape,
  // Walidacja MIĘDZYPOLOWA idzie przez `refine` (nie duplikuj jej w metadanych).
  refine: (schema) =>
    schema.refine((v) => v.endDate >= v.startDate, {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    }),
  fields: {
    name: { label: "Name", control: "text", list: { sortable: true, filterable: true } },
    description: { label: "Description", control: "textarea", list: { visible: false } },
    status: {
      label: "Status",
      control: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
      ],
      list: { filterable: true },
    },
    startDate: { label: "Start date", control: "date", list: { sortable: true } },
    endDate: { label: "End date", control: "date", list: { sortable: true } },
  },
});
```

Eksportuj encję z `packages/schemas/src/index.ts`. **Relacje** opisujesz przez `control: "relation"`

- `relation: { entity, displayField }` (patrz `task.entity.ts`: `projectId` → `project`,
  `assigneeId` → `user`). Metadane napędzają później kolumny admina, formularze i comboboxy.

* `defineEntity` zwraca też `entity.validation` — schemat z walidacją międzypolową (albo sam
  `schema`, gdy `refine` nieustawione). To go używa API jako body tworzenia.
* Etykiety (`label`, `options[].label`) są **po angielsku** (język admina). Reszta repo jest PL.

## 2. Tabela Drizzle

Osobny plik schematu w module API. Pola audytowe i soft delete **z helperów** — nie ręcznie.
Enumy trzymamy jako `text` z `.$type<>()`, żeby typ wiersza spinał się z enumem Zod:

```ts
// apps/api/src/modules/projects/projects.schema.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").$type<"active" | "archived">().notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});
```

**Relacje** przez `.references()` z jawną polityką `onDelete` (patrz `tasks.schema.ts`):
`project_id` → `projects` (`cascade`, relacja generator→generator), `assignee_id` → `users`
(`set null`, relacja generator→core).

Zarejestruj schemat w kotwicy `apps/api/src/db/schema.ts` — **jedna linia**:

```ts
export * from "../modules/projects/projects.schema.js";
// scaffolder:schema-export — do not remove
```

## 3. Migracja

```bash
pnpm --filter @repo/api db:generate   # buduje dist, potem drizzle-kit generate
pnpm --filter @repo/api db:migrate    # apply (lokalnie / w CI na TEST_DATABASE_URL)
```

Migracje **generowane ze schematu, nigdy pisane ręcznie**. Zmiany łamiące: expand → migrate →
contract (patrz `jak-dodac-migracje.md`).

## 4. Moduł API: dto → repository → service → routes

- **`*.dto.ts`** — schematy req/res **wywiedzione z encji**, nie pisane od zera:

  ```ts
  export const CreateProjectSchema = projectEntity.validation; // z walidacją międzypolową
  export const UpdateProjectSchema = projectEntity.schema.partial();
  export const ProjectResponseSchema = projectEntity.schema.extend({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    createdBy: z.string().uuid().nullable(),
  });
  // Query listy: PaginationQuerySchema.extend({ <filtry>, sort, order })
  ```

- **`*.repository.ts`** — tylko zapytania, soft-delete-aware (`isNull(deletedAt)` /
  `notDeleted()`). Sort po **allowliście kolumn** (`SORT_COLUMNS`), nie po dowolnym stringu.
- **`*.service.ts`** — logika biznesowa: mapowanie braków na `NotFoundError`, walidacja istnienia
  encji powiązanych (`assertRelations` → `BadRequestError`), wstrzyknięcie `createdBy` z sesji.
- **`*.routes.ts`** — `FastifyPluginAsyncZod`; każdy handler `preHandler: [app.authenticate]`;
  `schema.{querystring,params,body,response}` ze schematów DTO. Kontroler nie zna SQL-a.

Rejestracja w kotwicy `apps/api/src/modules/index.ts` — **jedna linia**:

```ts
await app.register(projectsRoutes({ db: deps.db }), { prefix: "/projects" });
// scaffolder:entities-register — do not remove
```

## 5. Testy (Vitest)

Integracyjne, za `describe.skipIf(!process.env.TEST_DATABASE_URL)` (patrz `test/entities.test.ts`).
Buduj app przez `buildTestApp()`, uwierzytelnij się (`register` → `login` → cookie `access_token`).
Pokryj: CRUD, paginację/filtry/sort, walidację (400, w tym międzypolową), soft delete (po delete
get→404), `createdBy` z sesji, relacje (istniejące + odrzucenie nieistniejącego FK).

> Pliki testowe dzielą jeden Postgres — `fileParallelism: false` w `vitest.config.ts` trzyma je
> sekwencyjnie (bez tego `TRUNCATE` z jednego pliku czyściłby dane drugiego).

## 6. OpenAPI

Nie piszesz ręcznie — generuje się ze schematów tras. Sprawdź `GET /api/v1/openapi.json`.

## Poza zakresem generatora (tylko przepis ręczny — później)

Relacje **M:N z atrybutami** (tabela pośrednia), pełnotekstowe wyszukiwanie. W generatorze:
1:N — tak; soft delete + audyt — domyślnie.
