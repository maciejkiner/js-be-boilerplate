import { timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Pola audytowe — konwencja dołączana do każdej encji (spread do `pgTable`).
 * `updatedAt` jest aktualizowany przez Drizzle przy każdym update (`$onUpdate`),
 * bez triggerów w bazie.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Soft delete — `null` = aktywny, ustawiony timestamp = usunięty.
 * Do filtrowania używaj `notDeleted(table.deletedAt)` z `query.ts`.
 */
export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/**
 * `createdBy` — uuid usera, który utworzył rekord. Klucz obcy do `users` dokładamy
 * w Fazie 3 (gdy tabela istnieje); teraz zwykły uuid (nullable), by konwencja
 * obowiązywała od razu.
 */
export const createdBy = {
  createdBy: uuid("created_by"),
};
