# Przepis: jak dodać/zastosować migrację (Drizzle)

Warstwa danych: **Drizzle + PostgreSQL**. Schemat to kod TS w modułach; migracje generujemy z
tego schematu, nigdy nie piszemy DDL ręcznie (poza świadomymi wyjątkami data-migration).

## Konwencje

- **Pola audytowe i soft delete** dołączamy przez helpery z `src/db/columns.ts`:

  ```ts
  import { pgTable, uuid, text } from "drizzle-orm/pg-core";
  import { timestamps, softDelete, createdBy } from "../../db/columns.js";

  export const products = pgTable("products", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ...timestamps, // created_at, updated_at ($onUpdate)
    ...softDelete, // deleted_at (null = aktywny)
    ...createdBy, // created_by (uuid usera)
  });
  ```

- **Odczyty** pomijające usunięte: `where(notDeleted(products.deletedAt))` z `src/db/query.ts`.
- **Rejestracja schematu**: dopisz `export * from "../modules/<nazwa>/<nazwa>.schema.js";`
  przy kotwicy `// scaffolder:schema-export` w `src/db/schema.ts` (drizzle-kit czyta ten plik).

## Kroki

1. **Zdefiniuj/zmień tabelę** w `src/modules/<nazwa>/<nazwa>.schema.ts` i zarejestruj w `schema.ts`.
2. **Wygeneruj migrację**: `pnpm --filter @repo/api db:generate` → plik SQL + wpis w `drizzle/meta`.
   Przejrzyj wygenerowany SQL przed commitem.
3. **Zastosuj lokalnie**: `pnpm --filter @repo/api db:migrate` (wymaga `DATABASE_URL`; `docker compose up -d`).
4. **Commit** migracji razem ze zmianą schematu.

## Backward compatibility — expand → migrate → contract

Zmiany łamiące rozkładamy na etapy, żeby stary i nowy kod działały w okresie przejściowym:

1. **expand** — dodaj nowe (kolumna nullable / nowa tabela), nie ruszaj starego.
2. **migrate** — przenieś/uzupełnij dane (osobna migracja danych).
3. **contract** — usuń stare dopiero, gdy nikt już z niego nie korzysta.

Nigdy nie usuwaj/nie zmieniaj kolumny w tym samym kroku, w którym dodajesz jej następcę.

## Seedy

Seedery (`src/db/seed.ts`, rejestr przy kotwicy `// scaffolder:seeds`) **muszą być idempotentne**
(`onConflictDoNothing` / upsert) — `pnpm --filter @repo/api db:seed` można uruchamiać wielokrotnie.
