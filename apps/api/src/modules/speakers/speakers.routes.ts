import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateSpeakerSchema,
  IdParamSchema,
  SpeakerListQuerySchema,
  SpeakerListResponseSchema,
  SpeakerResponseSchema,
  UpdateSpeakerSchema,
} from "./speakers.dto.js";
import { speakersService } from "./speakers.service.js";

/** CRUD for speakers under /api/v1/speakers. Generated: routes → service → repository; auth required. */
export function speakersRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["speakers"],
          querystring: SpeakerListQuerySchema,
          response: { 200: SpeakerListResponseSchema },
        },
      },
      async (request) => speakersService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["speakers"],
          params: IdParamSchema,
          response: { 200: SpeakerResponseSchema },
        },
      },
      async (request) => speakersService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["speakers"],
          body: CreateSpeakerSchema,
          response: { 201: SpeakerResponseSchema },
        },
      },
      async (request, reply) => {
        const row = await speakersService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["speakers"],
          params: IdParamSchema,
          body: UpdateSpeakerSchema,
          response: { 200: SpeakerResponseSchema },
        },
      },
      async (request) => speakersService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["speakers"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await speakersService.remove(db, request.params.id);
        return { message: "Speaker usunięty." };
      },
    );
  };
}
