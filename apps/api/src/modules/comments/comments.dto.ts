import { commentEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateCommentSchema = commentEntity.validation;
export const UpdateCommentSchema = commentEntity.schema.partial();

export const CommentResponseSchema = commentEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const CommentListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["active", "deleted"]).optional(),
  taskId: z.string().uuid().optional(),
  sort: z.enum(["createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const CommentListResponseSchema = paginatedResponse(CommentResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type CommentListQuery = z.infer<typeof CommentListQuerySchema>;
