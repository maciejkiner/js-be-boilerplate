import { type Column, isNull } from "drizzle-orm";

/**
 * Filtr soft-delete: tylko nieusunięte rekordy. Przekaż kolumnę `deletedAt` tabeli,
 * np. `where(notDeleted(products.deletedAt))`.
 */
export function notDeleted(deletedAt: Column) {
  return isNull(deletedAt);
}
