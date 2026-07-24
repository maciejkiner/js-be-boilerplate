import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { passwordCredentials, passwordResetTokens, sessions, users } from "./auth.schema.js";

type NewUser = { email: string; roles?: string[] };

/** Dostęp do danych auth. Bez logiki biznesowej — tylko zapytania. */
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

  async createUser(db: Db, data: NewUser) {
    const [row] = await db
      .insert(users)
      .values({ email: data.email, roles: data.roles })
      .returning();
    return row!;
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
