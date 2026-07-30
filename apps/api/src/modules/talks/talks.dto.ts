import { talkEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateTalkSchema = talkEntity.validation;
export const UpdateTalkSchema = talkEntity.schema.partial();

export const TalkResponseSchema = talkEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const TalkListQuerySchema = PaginationQuerySchema.extend({
  track: z.enum(["product", "engineering", "design", "business"]).optional(),
  level: z.enum(["intro", "intermediate", "advanced"]).optional(),
  eventId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  sort: z.enum(["title", "startsAt", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const TalkListResponseSchema = paginatedResponse(TalkResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type TalkListQuery = z.infer<typeof TalkListQuerySchema>;
