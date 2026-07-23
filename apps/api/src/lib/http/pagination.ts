import { z } from "zod";

/**
 * Paginacja offset-based — konwencja core (prostsza, wystarczająca dla admina).
 * Cursor-based jest przepisem dla publicznych list (Faza 9). Używane od Fazy 4.
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

/** Owija schemat elementu w kształt odpowiedzi listy: `{ items, meta }`. */
export function paginatedResponse<Item extends z.ZodTypeAny>(item: Item) {
  return z.object({
    items: z.array(item),
    meta: PaginationMetaSchema,
  });
}

/** Buduje ciało odpowiedzi listy z pozycji, sumy i parametrów paginacji. */
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
