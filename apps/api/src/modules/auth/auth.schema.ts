import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdBy, softDelete, timestamps } from "../../db/columns.js";

/** Userzy. `roles` = proste RBAC na poziomie usera (domyślnie ["user"]). */
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
 * Poświadczenia providera email+hasło. Osobna tabela = granica providera tożsamości:
 * kolejny provider (np. social login) dokłada własną tabelę, nie ruszając `users`.
 */
export const passwordCredentials = pgTable("password_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

/** Sesje = refresh tokeny (hashowane). Rotowane przy każdym odświeżeniu. */
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Tokeny resetu hasła (hashowane, jednorazowe, wygasające). */
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
