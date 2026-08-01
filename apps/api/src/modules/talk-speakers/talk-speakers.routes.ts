import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateTalkSpeakerSchema,
  IdParamSchema,
  TalkSpeakerListQuerySchema,
  TalkSpeakerListResponseSchema,
  TalkSpeakerResponseSchema,
  UpdateTalkSpeakerSchema,
} from "./talk-speakers.dto.js";
import { talkSpeakersService } from "./talk-speakers.service.js";

/** CRUD for talkSpeakers under /api/v1/talk-speakers. Generated: routes → service → repository; auth required. */
export function talkSpeakersRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talk-speakers"],
          querystring: TalkSpeakerListQuerySchema,
          response: { 200: TalkSpeakerListResponseSchema },
        },
      },
      async (request) => talkSpeakersService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talk-speakers"],
          params: IdParamSchema,
          response: { 200: TalkSpeakerResponseSchema },
        },
      },
      async (request) => talkSpeakersService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talk-speakers"],
          body: CreateTalkSpeakerSchema,
          response: { 201: TalkSpeakerResponseSchema },
        },
      },
      async (request, reply) => {
        const row = await talkSpeakersService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talk-speakers"],
          params: IdParamSchema,
          body: UpdateTalkSpeakerSchema,
          response: { 200: TalkSpeakerResponseSchema },
        },
      },
      async (request) => talkSpeakersService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talk-speakers"],
          params: IdParamSchema,
          response: { 200: MessageSchema },
        },
      },
      async (request) => {
        await talkSpeakersService.remove(db, request.params.id);
        return { message: "Talk speaker usunięty." };
      },
    );
  };
}
