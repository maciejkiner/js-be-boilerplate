import { talkSpeakerEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateTalkSpeakerSchema = talkSpeakerEntity.validation;
export const UpdateTalkSpeakerSchema = talkSpeakerEntity.schema.partial();

export const TalkSpeakerResponseSchema = talkSpeakerEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const TalkSpeakerListQuerySchema = PaginationQuerySchema.extend({
  talkId: z.string().uuid().optional(),
  speakerId: z.string().uuid().optional(),
  sort: z.enum(["orderIndex", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const TalkSpeakerListResponseSchema = paginatedResponse(TalkSpeakerResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type TalkSpeakerListQuery = z.infer<typeof TalkSpeakerListQuerySchema>;
