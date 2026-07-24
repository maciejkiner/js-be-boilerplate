import type { Env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../../lib/http/problem.js";
import type { Mailer } from "../../lib/mailer/index.js";
import { authRepository } from "./auth.repository.js";
import type { Credentials, PublicUser } from "./auth.dto.js";
import { hashPassword } from "./password.js";
import { createPasswordProvider } from "./providers/password-provider.js";
import { type AccessTokenPayload, generateOpaqueToken, hashToken } from "./tokens.js";

export interface AuthServiceDeps {
  db: Db;
  env: Env;
  mailer: Mailer;
  signAccessToken: (payload: AccessTokenPayload) => string;
}

export interface IssuedTokens {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

type UserRow = { id: string; email: string; roles: string[]; isActive: boolean };

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, roles: row.roles, isActive: row.isActive };
}

export function createAuthService(deps: AuthServiceDeps) {
  const { db, env, mailer, signAccessToken } = deps;
  const passwordProvider = createPasswordProvider(db);

  async function issueTokens(user: UserRow): Promise<IssuedTokens> {
    const accessToken = signAccessToken({ sub: user.id, email: user.email, roles: user.roles });
    const { token: refreshToken, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await authRepository.createSession(db, user.id, tokenHash, expiresAt);
    return { user: toPublicUser(user), accessToken, refreshToken };
  }

  return {
    async register(input: Credentials): Promise<PublicUser> {
      const existing = await authRepository.findActiveUserByEmail(db, input.email);
      if (existing) {
        throw new ConflictError("Użytkownik z tym adresem e-mail już istnieje.");
      }
      const user = await authRepository.createUser(db, { email: input.email });
      await authRepository.setPasswordCredential(db, user.id, await hashPassword(input.password));
      return toPublicUser(user);
    },

    async login(credentials: Credentials): Promise<IssuedTokens> {
      const result = await passwordProvider.verify(credentials);
      if (!result) {
        throw new UnauthorizedError("Nieprawidłowy e-mail lub hasło.");
      }
      const user = await authRepository.findUserById(db, result.userId);
      if (!user) {
        throw new UnauthorizedError("Nieprawidłowy e-mail lub hasło.");
      }
      return issueTokens(user);
    },

    async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
      if (!refreshToken) {
        throw new UnauthorizedError("Brak tokenu odświeżania.");
      }
      const tokenHash = hashToken(refreshToken);
      const session = await authRepository.findValidSession(db, tokenHash);
      if (!session) {
        throw new UnauthorizedError("Sesja wygasła lub jest nieprawidłowa.");
      }
      const user = await authRepository.findUserById(db, session.userId);
      if (!user) {
        throw new UnauthorizedError("Sesja wygasła lub jest nieprawidłowa.");
      }
      // Rotacja: stary refresh unieważniony, nowy wydany.
      await authRepository.deleteSession(db, tokenHash);
      return issueTokens(user);
    },

    async logout(refreshToken: string | undefined): Promise<void> {
      if (refreshToken) {
        await authRepository.deleteSession(db, hashToken(refreshToken));
      }
    },

    async me(userId: string): Promise<PublicUser> {
      const user = await authRepository.findUserById(db, userId);
      if (!user) {
        throw new UnauthorizedError("Użytkownik nie istnieje.");
      }
      return toPublicUser(user);
    },

    async requestPasswordReset(email: string): Promise<void> {
      const user = await authRepository.findActiveUserByEmail(db, email);
      // Nie ujawniamy, czy konto istnieje — zawsze kończymy sukcesem.
      if (!user) {
        return;
      }
      const { token, tokenHash } = generateOpaqueToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await authRepository.createPasswordResetToken(db, user.id, tokenHash, expiresAt);

      const link = `${env.PASSWORD_RESET_URL}?token=${token}`;
      await mailer.send({
        to: user.email,
        subject: "Reset hasła",
        text: `Aby ustawić nowe hasło, otwórz: ${link}\nLink wygasa za godzinę.`,
      });
    },

    async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
      const resetToken = await authRepository.findValidResetToken(db, hashToken(token));
      if (!resetToken) {
        throw new BadRequestError("Token resetu jest nieprawidłowy lub wygasł.");
      }
      await authRepository.setPasswordCredential(
        db,
        resetToken.userId,
        await hashPassword(newPassword),
      );
      await authRepository.markResetTokenUsed(db, resetToken.id);
      // Bezpieczeństwo: po zmianie hasła unieważniamy wszystkie sesje.
      await authRepository.deleteAllUserSessions(db, resetToken.userId);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
