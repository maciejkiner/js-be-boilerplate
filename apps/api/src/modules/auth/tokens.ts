import { createHash, randomBytes } from "node:crypto";

/**
 * The access token (JWT) payload. `sub` is the userId. Shared by signing and verification
 * (see the `@fastify/jwt` augmentation in authenticate.ts).
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

/**
 * An opaque token: a random secret (for the cookie or link) plus its hash (for the database). Used
 * for refresh tokens and password reset tokens — we store the hash and nothing else.
 */
export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

/** The token hash (sha256). The tokens have high entropy, so a fast hash is enough. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
