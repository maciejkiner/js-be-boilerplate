import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

/** Lekki widok usera do pól relacji (assignee) — bez danych wrażliwych. */
export const UserListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

export const UserListQuerySchema = PaginationQuerySchema.extend({
  q: z.string().optional(),
});

export const UserListResponseSchema = paginatedResponse(UserListItemSchema);

export type UserListQuery = z.infer<typeof UserListQuerySchema>;
