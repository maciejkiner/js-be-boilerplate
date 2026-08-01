import type { Env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http/problem.js";
import type { Mailer } from "../../lib/mailer/index.js";
import { authRepository } from "../auth/auth.repository.js";
import { generateOpaqueToken } from "../auth/tokens.js";
import type { InviteUserInput, UpdateRolesInput, UserListQuery } from "./users.dto.js";

export interface UsersServiceDeps {
  db: Db;
  env: Env;
  mailer: Mailer;
}

type UserRow = {
  id: string;
  email: string;
  roles: string[];
  createdAt: Date;
  deletedAt: Date | null;
};

/** The API view — `active` derived from soft delete; we never expose `deletedAt`/`isActive`. */
function toAdminView(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    roles: row.roles,
    createdAt: row.createdAt,
    active: row.deletedAt === null,
  };
}

/** User management (the admin panel). It reuses auth (reset tokens + the mailer) rather than duplicating it. */
export function createUsersService({ db, env, mailer }: UsersServiceDeps) {
  /** Sends the set-password link (an invitation or a reset) — it reuses the password reset tokens. */
  async function sendSetPasswordEmail(
    user: { id: string; email: string },
    kind: "invite" | "reset",
  ) {
    const { token, tokenHash } = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h — same as the reset flow
    await authRepository.createPasswordResetToken(db, user.id, tokenHash, expiresAt);
    const link = `${env.PASSWORD_RESET_URL}?token=${token}`;
    await mailer.send({
      to: user.email,
      subject: kind === "invite" ? "Zaproszenie — ustaw hasło" : "Reset hasła",
      text:
        kind === "invite"
          ? `Utworzono dla Ciebie konto. Ustaw hasło: ${link}\nLink wygasa za godzinę.`
          : `Aby ustawić nowe hasło, otwórz: ${link}\nLink wygasa za godzinę.`,
    });
  }

  return {
    async list(query: UserListQuery) {
      const { items, total } = await authRepository.listUsers(db, query);
      return { items: items.map(toAdminView), total };
    },

    async getById(id: string) {
      const row = await authRepository.findUserByIdAny(db, id);
      if (!row) {
        throw new NotFoundError("Użytkownik nie istnieje.");
      }
      return toAdminView(row);
    },

    async invite(input: InviteUserInput) {
      const existing = await authRepository.findUserByEmailAny(db, input.email);
      if (existing) {
        // `errors` names the form field — otherwise the UI can only guess ("e-mail taken?").
        throw new ConflictError("Użytkownik z tym adresem e-mail już istnieje.", {
          errors: [{ path: "email", message: "Ten adres jest już zajęty." }],
        });
      }
      const user = await authRepository.createUser(db, { email: input.email, roles: input.roles });
      await sendSetPasswordEmail(user, "invite");
      return toAdminView(user);
    },

    async updateRoles(actingUserId: string, id: string, input: UpdateRolesInput) {
      // A guard against self-lockout: an admin cannot strip their own admin role.
      if (id === actingUserId && !input.roles.includes("admin")) {
        throw new BadRequestError("Nie możesz odebrać sobie roli admina.");
      }
      const row = await authRepository.updateUserRoles(db, id, input.roles);
      if (!row) {
        throw new NotFoundError("Użytkownik nie istnieje.");
      }
      return toAdminView(row);
    },

    async deactivate(actingUserId: string, id: string) {
      if (id === actingUserId) {
        throw new BadRequestError("Nie możesz dezaktywować własnego konta.");
      }
      const row = await authRepository.deactivateUser(db, id);
      if (!row) {
        throw new NotFoundError("Użytkownik nie istnieje lub jest już nieaktywny.");
      }
      // Deactivation signs the user out everywhere (every session is invalidated).
      await authRepository.deleteAllUserSessions(db, id);
      return toAdminView(row);
    },

    async reactivate(id: string) {
      const row = await authRepository.reactivateUser(db, id);
      if (!row) {
        throw new NotFoundError("Użytkownik nie istnieje.");
      }
      return toAdminView(row);
    },

    async sendPasswordReset(id: string) {
      const user = await authRepository.findUserByIdAny(db, id);
      if (!user) {
        throw new NotFoundError("Użytkownik nie istnieje.");
      }
      await sendSetPasswordEmail(user, "reset");
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
