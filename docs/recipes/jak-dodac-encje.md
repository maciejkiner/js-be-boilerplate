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

Encja = **schemat Zod** (kształt + walidacja, w tym międzypolowa) **+ metadane prezentacji** per pole.
Pola deklaruj **builderami `f.*`**: jedna deklaracja produkuje obie strony, więc `control` nie może
rozjechać się z typem Zod, a wartości `select` wpisujesz raz.

> **Nie deklaruj pól audytowych** (`id`, `createdAt`, `updatedAt`, `deletedAt`, `createdBy`) — są
> dokładane automatycznie do każdej tabeli z `apps/api/src/db/columns.ts`. Scaffolder odrzuci encję,
> która je zawiera (kolidowałyby ze spreadem helperów w schemacie Drizzle).

```ts
// packages/schemas/src/project/project.entity.ts
import { defineEntity } from "../lib/define-entity.js";
import { f } from "../lib/field-builder.js";

export const projectEntity = defineEntity({
  name: "project",
  plural: "projects",
  label: "Project",
  labelPlural: "Projects",
  displayField: "name", // pole-etykieta w comboboxach relacji do tej encji
  // Walidacja MIĘDZYPOLOWA idzie przez `refine` (nie duplikuj jej w metadanych).
  refine: (schema) =>
    schema.refine((v) => v.endDate >= v.startDate, {
      message: "End date must be on or after the start date.",
      path: ["endDate"],
    }),
  // Etykiety pominięte tam, gdzie wywiodą się z nazwy pola (`startDate` → „Start date").
  fields: {
    name: f.text().min(1).max(200).sortable().filterable(),
    description: f.textarea().max(2000).optional().hidden(),
    status: f.select({ active: "Active", archived: "Archived" }).filterable(),
    startDate: f.date().sortable(),
    endDate: f.date().sortable(),
  },
});
```

Eksportuj encję z `packages/schemas/src/index.ts`.

- **Kontrolki i metody** (`.min`, `.optional`, `.sortable`, `.hidden`, `.zod` …): tabela w
  `packages/schemas/README.md`. `f.` w edytorze wypisuje wszystkie dostępne kontrolki.
- **Relacje** — `f.relation(encja, poleEtykiety)` (patrz `task.entity.ts`: `projectId` → `project`,
  `assigneeId` → `user`). Metadane napędzają później kolumny admina, formularze i comboboxy.
- **Etykieta** pominięta w `.label()` wywodzi się z nazwy pola (`dueDate` → „Due date",
  `venueId` → „Venue"). Podawaj ją jawnie tylko wtedy, gdy ma brzmieć inaczej.
- **Unikalność** — `.unique()` na polu, złożona jako `unique: [["eventId", "email"]]` na encji.
  Wychodzi z tego częściowy indeks unikalny (soft delete zwalnia wartość) i 409 przy konflikcie.
- **Nazwa mnoga** może być zapisana dowolnie (`talkSpeakers`, `talk-speakers`, `talk_speakers`) —
  scaffolder sam wyprowadza z niej identyfikatory (`camelCase`), nazwę tabeli (`snake_case`) oraz
  ścieżkę API i nazwy plików (`kebab-case`). `name` encji musi być identyfikatorem camelCase.
- `defineEntity` zwraca też `entity.validation` — schemat z walidacją międzypolową (albo sam
  `schema`, gdy `refine` nieustawione). To go używa API jako body tworzenia.
- Etykiety (`label`, etykiety opcji) są **po angielsku** (język admina). Reszta repo jest PL.
- Kształt, którego buildery nie wyrażają: użyj `defineEntityRaw` (własny `schema` + surowe metadane
  pól) — escape hatch opisany w `packages/schemas/README.md`.

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
