import { eventEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateEventSchema = eventEntity.validation;
export const UpdateEventSchema = eventEntity.schema.partial();

export const EventResponseSchema = eventEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const EventListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  sort: z.enum(["name", "startsAt", "endsAt", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const EventListResponseSchema = paginatedResponse(EventResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type EventListQuery = z.infer<typeof EventListQuerySchema>;

/** Zaproszenia prelegentów — maile idą do mailera, NIE do bazy (jak w module projektów). */
export const InviteSpeakersSchema = z.object({
  emails: z.array(z.string().email()).min(1),
});

export const InviteResultSchema = z.object({ invited: z.number().int() });
