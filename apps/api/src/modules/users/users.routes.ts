import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import { paginate } from "../../lib/http/pagination.js";
import type { Mailer } from "../../lib/mailer/index.js";
import { MessageSchema } from "../auth/auth.dto.js";
import { requireRoles } from "../auth/rbac.js";
import {
  IdParamSchema,
  InviteUserSchema,
  UpdateRolesSchema,
  UserAdminSchema,
  UserListQuerySchema,
  UserListResponseSchema,
} from "./users.dto.js";
import { createUsersService } from "./users.service.js";

/**
 * User management under /api/v1/users — ADMIN ONLY (`requireRoles("admin")`).
 * List and detail plus inviting, changing roles, deactivating and reactivating, and triggering a
 * password reset. The list (status=active) is also the source for relation fields (`assignee`).
 */
export function usersRoutes(deps: { db: Db; env: Env; mailer: Mailer }): FastifyPluginAsyncZod {
  return async (app) => {
    const service = createUsersService(deps);
    const adminOnly = { preHandler: [app.authenticate, requireRoles("admin")] };

    app.get(
      "/",
      {
        ...adminOnly,
        schema: {
          tags: ["users"],
          querystring: UserListQuerySchema,
          response: { 200: UserListResponseSchema },
        },
      },
      async (request) => {
        const { items, total } = await service.list(request.query);
        return paginate(items, total, request.query);
      },
    );

    app.get(
      "/:id",
      {
        ...adminOnly,
        schema: { tags: ["users"], params: IdParamSchema, response: { 200: UserAdminSchema } },
      },
      async (request) => service.getById(request.params.id),
    );

    app.post(
      "/",
      {
        ...adminOnly,
        schema: { tags: ["users"], body: InviteUserSchema, response: { 201: UserAdminSchema } },
      },
      async (request, reply) => {
        const user = await service.invite(request.body);
        return reply.status(201).send(user);
      },
    );

    app.patch(
      "/:id/roles",
      {
        ...adminOnly,
        schema: {
          tags: ["users"],
          params: IdParamSchema,
          body: UpdateRolesSchema,
          response: { 200: UserAdminSchema },
        },
      },
      async (request) => service.updateRoles(request.user.sub, request.params.id, request.body),
    );

    app.post(
      "/:id/deactivate",
      {
        ...adminOnly,
        schema: { tags: ["users"], params: IdParamSchema, response: { 200: UserAdminSchema } },
      },
      async (request) => service.deactivate(request.user.sub, request.params.id),
    );

    app.post(
      "/:id/reactivate",
      {
        ...adminOnly,
        schema: { tags: ["users"], params: IdParamSchema, response: { 200: UserAdminSchema } },
      },
      async (request) => service.reactivate(request.params.id),
    );

    app.post(
      "/:id/password-reset",
      {
        ...adminOnly,
        schema: { tags: ["users"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await service.sendPasswordReset(request.params.id);
        return { message: "Wysłano e-mail resetujący hasło." };
      },
    );
  };
}
