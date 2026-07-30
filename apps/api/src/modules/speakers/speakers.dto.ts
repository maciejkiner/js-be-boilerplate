import { speakerEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateSpeakerSchema = speakerEntity.validation;
export const UpdateSpeakerSchema = speakerEntity.schema.partial();

export const SpeakerResponseSchema = speakerEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const SpeakerListQuerySchema = PaginationQuerySchema.extend({
  sort: z.enum(["fullName", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const SpeakerListResponseSchema = paginatedResponse(SpeakerResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type SpeakerListQuery = z.infer<typeof SpeakerListQuerySchema>;
