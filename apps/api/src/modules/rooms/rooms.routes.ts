import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateRoomSchema,
  IdParamSchema,
  RoomListQuerySchema,
  RoomListResponseSchema,
  RoomResponseSchema,
  UpdateRoomSchema,
} from "./rooms.dto.js";
import { roomsService } from "./rooms.service.js";

/** CRUD for rooms under /api/v1/rooms. Generated: routes → service → repository; auth required. */
export function roomsRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["rooms"],
          querystring: RoomListQuerySchema,
          response: { 200: RoomListResponseSchema },
        },
      },
      async (request) => roomsService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["rooms"], params: IdParamSchema, response: { 200: RoomResponseSchema } },
      },
      async (request) => roomsService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["rooms"], body: CreateRoomSchema, response: { 201: RoomResponseSchema } },
      },
      async (request, reply) => {
        const row = await roomsService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["rooms"],
          params: IdParamSchema,
          body: UpdateRoomSchema,
          response: { 200: RoomResponseSchema },
        },
      },
      async (request) => roomsService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["rooms"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await roomsService.remove(db, request.params.id);
        return { message: "Room usunięty." };
      },
    );
  };
}
