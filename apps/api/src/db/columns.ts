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
 * `createdBy` — uuid usera, który utworzył rekord. Zwykły uuid (nullable); klucz obcy do
 * `users` dokładany per-tabela tam, gdzie ma sens (encje domenowe od Fazy 4) — nie globalnie,
 * bo np. pierwszy user nie ma twórcy.
 */
export const createdBy = {
  createdBy: uuid("created_by"),
};
