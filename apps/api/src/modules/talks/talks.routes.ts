import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateTalkSchema,
  IdParamSchema,
  TalkListQuerySchema,
  TalkListResponseSchema,
  TalkResponseSchema,
  UpdateTalkSchema,
} from "./talks.dto.js";
import { talksService } from "./talks.service.js";

/** CRUD talks pod /api/v1/talks. Wygenerowane: trasy → service → repository; auth wymagany. */
export function talksRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talks"],
          querystring: TalkListQuerySchema,
          response: { 200: TalkListResponseSchema },
        },
      },
      async (request) => talksService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["talks"], params: IdParamSchema, response: { 200: TalkResponseSchema } },
      },
      async (request) => talksService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["talks"], body: CreateTalkSchema, response: { 201: TalkResponseSchema } },
      },
      async (request, reply) => {
        const row = await talksService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["talks"],
          params: IdParamSchema,
          body: UpdateTalkSchema,
          response: { 200: TalkResponseSchema },
        },
      },
      async (request) => talksService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["talks"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await talksService.remove(db, request.params.id);
        return { message: "Talk usunięty." };
      },
    );
  };
}
