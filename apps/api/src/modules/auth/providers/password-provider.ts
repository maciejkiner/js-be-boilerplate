import type { Db } from "../../../db/client.js";
import { authRepository } from "../auth.repository.js";
import { CredentialsSchema } from "../auth.dto.js";
import { verifyPassword } from "../password.js";
import type { IdentityProvider } from "./identity-provider.js";

/** Provider email+hasło — pierwsza implementacja interfejsu providera tożsamości. */
export function createPasswordProvider(db: Db): IdentityProvider {
  return {
    id: "password",
    async verify(credentials) {
      const parsed = CredentialsSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }
      const { email, password } = parsed.data;

      const user = await authRepository.findActiveUserByEmail(db, email);
      if (!user || !user.isActive) {
        return null;
      }
      const credential = await authRepository.findPasswordCredential(db, user.id);
      if (!credential) {
        return null;
      }
      const ok = await verifyPassword(credential.passwordHash, password);
      return ok ? { userId: user.id } : null;
    },
  };
}
