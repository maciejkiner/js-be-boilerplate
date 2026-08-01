import { type Column, isNull } from "drizzle-orm";

/**
 * The soft-delete filter: only rows that are not deleted. Pass the table's `deletedAt` column,
 * for example `where(notDeleted(products.deletedAt))`.
 */
export function notDeleted(deletedAt: Column) {
  return isNull(deletedAt);
}
