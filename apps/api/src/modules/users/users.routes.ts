import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { paginate } from "../../lib/http/pagination.js";
import { authRepository } from "../auth/auth.repository.js";
import { requireRoles } from "../auth/rbac.js";
import { UserListQuerySchema, UserListResponseSchema } from "./users.dto.js";

/** Lista userów pod /api/v1/users — dla pól relacji (assignee). Tylko admin. */
export function usersRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      "/",
      {
        preHandler: [app.authenticate, requireRoles("admin")],
        schema: {
          tags: ["users"],
          querystring: UserListQuerySchema,
          response: { 200: UserListResponseSchema },
        },
      },
      async (request) => {
        const { items, total } = await authRepository.listUsers(deps.db, request.query);
        return paginate(items, total, request.query);
      },
    );
  };
}
