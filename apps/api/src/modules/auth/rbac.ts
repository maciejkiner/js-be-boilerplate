import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/http/problem.js";

/**
 * Guard RBAC. Użyj po `app.authenticate` w preHandler:
 *   preHandler: [app.authenticate, requireRoles("admin")]
 * Przepuszcza, gdy user ma którąkolwiek z wymaganych ról.
 */
export function requireRoles(...roles: string[]) {
  return async function guard(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const userRoles = request.user?.roles ?? [];
    const allowed = roles.some((role) => userRoles.includes(role));
    if (!allowed) {
      throw new ForbiddenError("Brak wymaganej roli.");
    }
  };
}
