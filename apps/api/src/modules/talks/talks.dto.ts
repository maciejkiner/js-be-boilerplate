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

/**
 * Pozycja paczki „prelekcje wydarzenia" — `eventId` pochodzi ze ŚCIEŻKI (`/events/:id/talks`),
 * więc nie ma go w ciele. Porządek godzin sprawdza service (`schema` nie niesie `refine`).
 */
export const CreateTalkInEventSchema = talkEntity.schema.omit({ eventId: true });

export const CreateTalksBulkSchema = z.object({
  talks: z.array(CreateTalkInEventSchema).min(1).max(50),
});

export const CreateTalksBulkResponseSchema = z.object({
  created: z.number().int(),
  items: z.array(TalkResponseSchema),
});
