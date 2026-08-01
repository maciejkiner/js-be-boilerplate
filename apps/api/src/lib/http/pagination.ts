import { z } from "zod";

/**
 * Offset-based pagination — the core convention (simpler, and enough for the admin panel).
 * Cursor-based pagination exists as a recipe for public lists.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

/** Wraps an item schema in the list response shape: `{ items, meta }`. */
export function paginatedResponse<Item extends z.ZodTypeAny>(item: Item) {
  return z.object({
    items: z.array(item),
    meta: PaginationMetaSchema,
  });
}

/** Builds the list response body from the rows, the total and the pagination parameters. */
export function paginate<Item>(
  items: Item[],
  total: number,
  query: PaginationQuery,
): { items: Item[]; meta: z.infer<typeof PaginationMetaSchema> } {
  return {
    items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
