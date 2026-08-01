import { projectEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

/** The create body — the full entity schema including cross-field validation (endDate ≥ startDate). */
export const CreateProjectSchema = projectEntity.validation;

/** The update body — partial (no cross-field validation on partial data). */
export const UpdateProjectSchema = projectEntity.schema.partial();

/** The representation the API returns: the entity fields plus id and the audit columns. */
export const ProjectResponseSchema = projectEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

/** The list query: pagination plus a status filter and sorting by the allowed columns. */
export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["active", "archived"]).optional(),
  sort: z.enum(["name", "startDate", "endDate", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const ProjectListResponseSchema = paginatedResponse(ProjectResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

/** Member invitations — the addresses go to the mailer, NOT to the database (the wizard's proof of separation). */
export const InviteMembersSchema = z.object({
  emails: z.array(z.string().email()).min(1),
});

export const InviteResultSchema = z.object({ invited: z.number().int() });

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
