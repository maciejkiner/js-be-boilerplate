import { projectEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

/** Body tworzenia — pełny schemat encji z walidacją międzypolową (endDate ≥ startDate). */
export const CreateProjectSchema = projectEntity.validation;

/** Body aktualizacji — częściowy (bez walidacji międzypolowej na częściowych danych). */
export const UpdateProjectSchema = projectEntity.schema.partial();

/** Reprezentacja zwracana przez API: pola encji + id + pola audytowe. */
export const ProjectResponseSchema = projectEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

/** Query listy: paginacja + filtr po statusie + sort po dozwolonych kolumnach. */
export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["active", "archived"]).optional(),
  sort: z.enum(["name", "startDate", "endDate", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const ProjectListResponseSchema = paginatedResponse(ProjectResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>;
