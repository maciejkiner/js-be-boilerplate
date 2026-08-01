import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/http/problem.js";

/** The roles allowed in the system (per-user RBAC). Extend the list here — one source of truth. */
export const APP_ROLES = ["admin", "user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/**
 * The RBAC guard. Use it after `app.authenticate` in a preHandler:
 *   preHandler: [app.authenticate, requireRoles("admin")]
 * It passes when the user holds any of the required roles.
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
