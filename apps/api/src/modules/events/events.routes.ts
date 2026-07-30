import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateEventSchema,
  IdParamSchema,
  EventListQuerySchema,
  EventListResponseSchema,
  EventResponseSchema,
  UpdateEventSchema,
} from "./events.dto.js";
import { eventsService } from "./events.service.js";

/** CRUD events pod /api/v1/events. Wygenerowane: trasy → service → repository; auth wymagany. */
export function eventsRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["events"],
          querystring: EventListQuerySchema,
          response: { 200: EventListResponseSchema },
        },
      },
      async (request) => eventsService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["events"], params: IdParamSchema, response: { 200: EventResponseSchema } },
      },
      async (request) => eventsService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["events"],
          body: CreateEventSchema,
          response: { 201: EventResponseSchema },
        },
      },
      async (request, reply) => {
        const row = await eventsService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["events"],
          params: IdParamSchema,
          body: UpdateEventSchema,
          response: { 200: EventResponseSchema },
        },
      },
      async (request) => eventsService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["events"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await eventsService.remove(db, request.params.id);
        return { message: "Event usunięty." };
      },
    );
  };
}
