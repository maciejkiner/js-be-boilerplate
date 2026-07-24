import { createHash, randomBytes } from "node:crypto";

/**
 * Payload access tokena (JWT). `sub` = userId. Współdzielony przez podpis i weryfikację
 * (patrz augmentacja `@fastify/jwt` w authenticate.ts).
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

/**
 * Opaque token: losowy sekret (do cookie/linku) + jego hash (do bazy). Używany dla
 * refresh tokenów i tokenów resetu hasła — jawnie trzymamy tylko hash.
 */
export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

/** Hash tokena (sha256). Tokeny mają wysoką entropię, więc szybki hash wystarcza. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
