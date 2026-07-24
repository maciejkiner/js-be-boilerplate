import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../../lib/http/problem.js";
import type { AccessTokenPayload } from "./tokens.js";

// Typ payloadu JWT: to samo przy podpisie i po weryfikacji (request.user).
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

// app.authenticate jako współdzielony preHandler dla tras chronionych.
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * preHandler weryfikujący access token (cookie `access_token` lub nagłówek Authorization).
 * Po sukcesie `request.user` = payload. Brak/niepoprawny token → 401.
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError("Wymagane uwierzytelnienie.");
  }
}
