import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import type { Mailer } from "../../lib/mailer/index.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateProjectSchema,
  IdParamSchema,
  InviteMembersSchema,
  InviteResultSchema,
  ProjectListQuerySchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
  UpdateProjectSchema,
} from "./projects.dto.js";
import { projectsService } from "./projects.service.js";

/**
 * CRUD for projects under /api/v1/projects. The domain module pattern: controller (routes) →
 * service → repository. Every operation requires authentication; `createdBy` comes from the session.
 */
export function projectsRoutes(deps: { db: Db; mailer: Mailer }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db, mailer } = deps;

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

    // Invitations → the mailer (nothing persisted). The wizard uses this as a separate handler.
    app.post(
      "/:id/invitations",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["projects"],
          params: IdParamSchema,
          body: InviteMembersSchema,
          response: { 202: InviteResultSchema },
        },
      },
      async (request, reply) => {
        const result = await projectsService.inviteMembers(
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
