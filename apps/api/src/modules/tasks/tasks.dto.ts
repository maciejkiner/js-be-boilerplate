import { taskEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateTaskSchema = taskEntity.validation;
export const UpdateTaskSchema = taskEntity.schema.partial();

export const TaskResponseSchema = taskEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

/** Query listy: paginacja + filtry (status, priorytet, projekt) + sort. */
export const TaskListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  projectId: z.string().uuid().optional(),
  sort: z.enum(["dueDate", "title", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const TaskListResponseSchema = paginatedResponse(TaskResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;
