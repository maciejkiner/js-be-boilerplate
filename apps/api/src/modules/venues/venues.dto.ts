import { venueEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateVenueSchema = venueEntity.validation;
export const UpdateVenueSchema = venueEntity.schema.partial();

export const VenueResponseSchema = venueEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const VenueListQuerySchema = PaginationQuerySchema.extend({
  sort: z.enum(["name", "city", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const VenueListResponseSchema = paginatedResponse(VenueResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type VenueListQuery = z.infer<typeof VenueListQuerySchema>;
