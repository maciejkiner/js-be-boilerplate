import { and, asc, count, eq, gt, ilike, isNotNull, isNull, type SQL } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { passwordCredentials, passwordResetTokens, sessions, users } from "./auth.schema.js";

type NewUser = { email: string; roles?: string[] };

/** Auth data access. No business logic — queries only. */
export const authRepository = {
  findActiveUserByEmail(db: Db, email: string) {
    return db.query.users
      .findFirst({
        where: and(eq(users.email, email), isNull(users.deletedAt)),
      })
      .execute();
  },

  findUserById(db: Db, id: string) {
    return db.query.users
      .findFirst({ where: and(eq(users.id, id), isNull(users.deletedAt)) })
      .execute();
  },

  /** A user's details regardless of state (including deactivated) — for the admin panel. */
  findUserByIdAny(db: Db, id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) }).execute();
  },

  /** Checks e-mail uniqueness when inviting — it also catches deactivated accounts. */
  findUserByEmailAny(db: Db, email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) }).execute();
  },

  /**
   * The user list (id, email, roles, createdAt, deletedAt). Offset plus an e-mail filter and a
   * status. `active` (the default) means not deleted; relation fields (`assignee`) use that view.
   */
  async listUsers(db: Db, query: { page: number; pageSize: number; q?: string; status?: string }) {
    const status = query.status ?? "active";
    const conditions: SQL[] = [];
    if (status === "active") conditions.push(isNull(users.deletedAt));
    else if (status === "inactive") conditions.push(isNotNull(users.deletedAt));
    if (query.q) conditions.push(ilike(users.email, `%${query.q}%`));
    const where = conditions.length ? and(...conditions) : undefined;
    const [items, [totals]] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          roles: users.roles,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(where)
        .orderBy(asc(users.email))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(users).where(where),
    ]);
    return { items, total: totals?.value ?? 0 };
  },

  async createUser(db: Db, data: NewUser) {
    const [row] = await db
      .insert(users)
      .values({ email: data.email, roles: data.roles })
      .returning();
    return row!;
  },

  async updateUserRoles(db: Db, id: string, roles: string[]) {
    const [row] = await db
      .update(users)
      .set({ roles })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return row;
  },

  /** Deactivation is a soft delete (enforced by auth: login and me filter on `deletedAt`). */
  async deactivateUser(db: Db, id: string) {
    const [row] = await db
      .update(users)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return row;
  },

  async reactivateUser(db: Db, id: string) {
    const [row] = await db
      .update(users)
      .set({ deletedAt: null, isActive: true })
      .where(eq(users.id, id))
      .returning();
    return row;
  },

  async setPasswordCredential(db: Db, userId: string, passwordHash: string) {
    await db
      .insert(passwordCredentials)
      .values({ userId, passwordHash })
      .onConflictDoUpdate({
        target: passwordCredentials.userId,
        set: { passwordHash, updatedAt: new Date() },
      });
  },

  findPasswordCredential(db: Db, userId: string) {
    return db.query.passwordCredentials
      .findFirst({ where: eq(passwordCredentials.userId, userId) })
      .execute();
  },

  async createSession(db: Db, userId: string, refreshTokenHash: string, expiresAt: Date) {
    const [row] = await db
      .insert(sessions)
      .values({ userId, refreshTokenHash, expiresAt })
      .returning();
    return row!;
  },

  findValidSession(db: Db, refreshTokenHash: string) {
    return db.query.sessions
      .findFirst({
        where: and(
          eq(sessions.refreshTokenHash, refreshTokenHash),
          gt(sessions.expiresAt, new Date()),
        ),
      })
      .execute();
  },

  async deleteSession(db: Db, refreshTokenHash: string) {
    await db.delete(sessions).where(eq(sessions.refreshTokenHash, refreshTokenHash));
  },

  async deleteAllUserSessions(db: Db, userId: string) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  },

  async createPasswordResetToken(db: Db, userId: string, tokenHash: string, expiresAt: Date) {
    await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
  },

  findValidResetToken(db: Db, tokenHash: string) {
    return db.query.passwordResetTokens
      .findFirst({
        where: and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      })
      .execute();
  },

  async markResetTokenUsed(db: Db, id: string) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  },
};
