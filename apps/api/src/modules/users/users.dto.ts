import { z } from "zod";
import { PaginationQuerySchema, paginatedResponse } from "../../lib/http/pagination.js";
import { APP_ROLES } from "../auth/rbac.js";

/** The roles an admin can assign — from one source of truth (`APP_ROLES`). */
export const RolesSchema = z.array(z.enum(APP_ROLES)).min(1);

/**
 * The user view for the admin panel. `active` is derived from soft delete (`deletedAt === null`).
 * It carries `id` and `email`, so relation fields (`assignee`) reuse the same list endpoint.
 */
export const UserAdminSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  roles: z.array(z.string()),
  createdAt: z.date(),
  active: z.boolean(),
});

export const UserListQuerySchema = PaginationQuerySchema.extend({
  q: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
});

export const UserListResponseSchema = paginatedResponse(UserAdminSchema);

export const InviteUserSchema = z.object({
  email: z.string().email(),
  roles: RolesSchema.default(["user"]),
});

export const UpdateRolesSchema = z.object({ roles: RolesSchema });

export const IdParamSchema = z.object({ id: z.string().uuid() });

export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type InviteUserInput = z.infer<typeof InviteUserSchema>;
export type UpdateRolesInput = z.infer<typeof UpdateRolesSchema>;
