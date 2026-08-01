import type { Seeder } from "../../db/seed.js";
import { authRepository } from "./auth.repository.js";
import { hashPassword } from "./password.js";

/**
 * The default admin for development and tests. Idempotent (it skips when the account exists).
 * Change or refine it in your project — this is only a convenient start.
 */
export const adminSeeder: Seeder = {
  name: "admin-user",
  async run(db) {
    const email = "admin@example.com";
    const existing = await authRepository.findActiveUserByEmail(db, email);
    if (existing) {
      return;
    }
    const user = await authRepository.createUser(db, { email, roles: ["admin", "user"] });
    await authRepository.setPasswordCredential(db, user.id, await hashPassword("admin12345"));
  },
};
