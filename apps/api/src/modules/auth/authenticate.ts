import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../../lib/http/problem.js";
import type { AccessTokenPayload } from "./tokens.js";

// The JWT payload type: the same when signing and after verification (request.user).
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

// app.authenticate is the shared preHandler for protected routes.
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * The preHandler verifying the access token (the `access_token` cookie or the Authorization header).
 * Po sukcesie `request.user` = payload. Brak/niepoprawny token → 401.
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError("Wymagane uwierzytelnienie.");
  }
}
