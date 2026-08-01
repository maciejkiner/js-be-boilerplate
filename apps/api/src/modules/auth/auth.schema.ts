import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

/** Users. `roles` is the simple per-user RBAC (defaults to ["user"]). */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  roles: text("roles")
    .array()
    .notNull()
    .default(sql`ARRAY['user']::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
  ...softDelete,
  ...createdBy,
});

/**
 * The credentials of the email + password provider. A separate table is the identity provider
 * boundary: another provider (social login, say) adds its own table without touching `users`.
 */
export const passwordCredentials = pgTable("password_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

/** Sessions are refresh tokens (hashed). Rotated on every refresh. */
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Password reset tokens (hashed, single-use, expiring). */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
