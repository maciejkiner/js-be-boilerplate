import { roomEntity } from "@repo/schemas";
import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";

export const CreateRoomSchema = roomEntity.validation;
export const UpdateRoomSchema = roomEntity.schema.partial();

export const RoomResponseSchema = roomEntity.schema.extend({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid().nullable(),
});

export const RoomListQuerySchema = PaginationQuerySchema.extend({
  venueId: z.string().uuid().optional(),
  sort: z.enum(["name", "capacity", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const RoomListResponseSchema = paginatedResponse(RoomResponseSchema);

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type RoomListQuery = z.infer<typeof RoomListQuerySchema>;
