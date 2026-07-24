import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateProjectSchema,
  IdParamSchema,
  ProjectListQuerySchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  UpdateProjectSchema,
} from "./projects.dto.js";
import { projectsService } from "./projects.service.js";

/**
 * CRUD projektów pod /api/v1/projects. Wzorzec modułu domenowego: kontroler (trasy) →
 * service → repository. Wszystkie operacje wymagają uwierzytelnienia; `createdBy` z sesji.
 */
export function projectsRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["projects"],
          querystring: ProjectListQuerySchema,
          response: { 200: ProjectListResponseSchema },
        },
      },
      async (request) => projectsService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["projects"],
          params: IdParamSchema,
          response: { 200: ProjectResponseSchema },
        },
      },
      async (request) => projectsService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["projects"],
          body: CreateProjectSchema,
          response: { 201: ProjectResponseSchema },
        },
      },
      async (request, reply) => {
        const project = await projectsService.create(db, request.body, request.user.sub);
        return reply.status(201).send(project);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["projects"],
          params: IdParamSchema,
          body: UpdateProjectSchema,
          response: { 200: ProjectResponseSchema },
        },
      },
      async (request) => projectsService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["projects"],
          params: IdParamSchema,
          response: { 200: MessageSchema },
        },
      },
      async (request) => {
        await projectsService.remove(db, request.params.id);
        return { message: "Projekt usunięty." };
      },
    );
  };
}
