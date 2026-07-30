import { registrationEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateRegistrationSchema = registrationEntity.validation;
export const UpdateRegistrationSchema = registrationEntity.schema.partial();

export const RegistrationResponseSchema = registrationEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const RegistrationListQuerySchema = PaginationQuerySchema.extend({
  eventId: z.string().uuid().optional(),
  ticketType: z.enum(["standard", "student", "speaker"]).optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  sort: z.enum(["fullName", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const RegistrationListResponseSchema = paginatedResponse(RegistrationResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type RegistrationListQuery = z.infer<typeof RegistrationListQuerySchema>;
