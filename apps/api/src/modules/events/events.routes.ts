import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import type { Mailer } from "../../lib/mailer/index.js";
import { CreateTalksBulkResponseSchema, CreateTalksBulkSchema } from "../talks/talks.dto.js";
import { talksService } from "../talks/talks.service.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateEventSchema,
  IdParamSchema,
  InviteResultSchema,
  InviteSpeakersSchema,
  EventListQuerySchema,
  EventListResponseSchema,
  EventResponseSchema,
  UpdateEventSchema,
} from "./events.dto.js";
import { eventsService } from "./events.service.js";

/** CRUD events pod /api/v1/events. Wygenerowane: trasy → service → repository; auth wymagany. */
export function eventsRoutes(deps: { db: Db; mailer: Mailer }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db, mailer } = deps;

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
    /**
     * Agenda hurtem — krok 2 kreatora wydarzenia. `eventId` bierzemy ze ścieżki, więc ciało niesie
     * same prelekcje. Semantyka „wszystko albo nic": kolizja w dowolnej pozycji odrzuca całą paczkę.
     */
    app.post(
      "/:id/talks",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["events"],
          params: IdParamSchema,
          body: CreateTalksBulkSchema,
          response: { 201: CreateTalksBulkResponseSchema },
        },
      },
      async (request, reply) => {
        const items = await talksService.createManyForEvent(
          db,
          request.params.id,
          request.body.talks,
          request.user.sub,
        );
        return reply.status(201).send({ created: items.length, items });
      },
    );

    /** Zaproszenia prelegentów — wyłącznie mailer, żadnego zapisu (dowód separacji od CRUD). */
    app.post(
      "/:id/invitations",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["events"],
          params: IdParamSchema,
          body: InviteSpeakersSchema,
          response: { 202: InviteResultSchema },
        },
      },
      async (request, reply) => {
        const result = await eventsService.inviteSpeakers(
          db,
          request.params.id,
          request.body.emails,
          mailer,
        );
        return reply.status(202).send(result);
      },
    );
  };
}
