import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateCommentSchema,
  IdParamSchema,
  CommentListQuerySchema,
  CommentListResponseSchema,
  CommentResponseSchema,
  UpdateCommentSchema,
} from "./comments.dto.js";
import { commentsService } from "./comments.service.js";

/** CRUD comments pod /api/v1/comments. Wygenerowane: trasy → service → repository; auth wymagany. */
export function commentsRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["comments"],
          querystring: CommentListQuerySchema,
          response: { 200: CommentListResponseSchema },
        },
      },
      async (request) => commentsService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["comments"],
          params: IdParamSchema,
          response: { 200: CommentResponseSchema },
        },
      },
      async (request) => commentsService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["comments"],
          body: CreateCommentSchema,
          response: { 201: CommentResponseSchema },
        },
      },
      async (request, reply) => {
        const row = await commentsService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["comments"],
          params: IdParamSchema,
          body: UpdateCommentSchema,
          response: { 200: CommentResponseSchema },
        },
      },
      async (request) => commentsService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["comments"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await commentsService.remove(db, request.params.id);
        return { message: "Comment usunięty." };
      },
    );
  };
}
