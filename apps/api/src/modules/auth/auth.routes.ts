import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import type { Mailer } from "../../lib/mailer/index.js";
import {
  AuthResponseSchema,
  CredentialsSchema,
  MessageSchema,
  PasswordResetConfirmSchema,
  PasswordResetRequestSchema,
  UserSchema,
} from "./auth.dto.js";
import { createAuthService } from "./auth.service.js";
import { clearAuthCookies, readRefreshCookie, setAuthCookies } from "./cookies.js";
import { requireRoles } from "./rbac.js";

/** Trasy auth montowane pod /api/v1/auth. Wymagają zarejestrowanych @fastify/jwt i @fastify/cookie. */
export function authRoutes(deps: { db: Db; env: Env; mailer: Mailer }): FastifyPluginAsyncZod {
  return async (app) => {
    const service = createAuthService({
      db: deps.db,
      env: deps.env,
      mailer: deps.mailer,
      signAccessToken: (payload) =>
        app.jwt.sign(payload, { expiresIn: `${deps.env.ACCESS_TOKEN_TTL_MINUTES}m` }),
    });

    app.post(
      "/register",
      {
        schema: {
          tags: ["auth"],
          body: CredentialsSchema,
          response: { 201: AuthResponseSchema },
        },
      },
      async (request, reply) => {
        const user = await service.register(request.body);
        return reply.status(201).send({ user });
      },
    );

    app.post(
      "/login",
      {
        schema: { tags: ["auth"], body: CredentialsSchema, response: { 200: AuthResponseSchema } },
      },
      async (request, reply) => {
        const { user, accessToken, refreshToken } = await service.login(request.body);
        setAuthCookies(reply, deps.env, { accessToken, refreshToken });
        return { user };
      },
    );

    app.post(
      "/refresh",
      { schema: { tags: ["auth"], response: { 200: AuthResponseSchema } } },
      async (request, reply) => {
        const { user, accessToken, refreshToken } = await service.refresh(
          readRefreshCookie(request.cookies),
        );
        setAuthCookies(reply, deps.env, { accessToken, refreshToken });
        return { user };
      },
    );

    app.post(
      "/logout",
      { schema: { tags: ["auth"], response: { 200: MessageSchema } } },
      async (request, reply) => {
        await service.logout(readRefreshCookie(request.cookies));
        clearAuthCookies(reply, deps.env);
        return { message: "Wylogowano." };
      },
    );

    app.get(
      "/me",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["auth"], response: { 200: UserSchema } },
      },
      async (request) => service.me(request.user.sub),
    );

    app.post(
      "/password-reset/request",
      {
        schema: {
          tags: ["auth"],
          body: PasswordResetRequestSchema,
          response: { 202: MessageSchema },
        },
      },
      async (request, reply) => {
        await service.requestPasswordReset(request.body.email);
        return reply.status(202).send({ message: "Jeśli konto istnieje, wysłaliśmy instrukcje." });
      },
    );

    app.post(
      "/password-reset/confirm",
      {
        schema: {
          tags: ["auth"],
          body: PasswordResetConfirmSchema,
          response: { 200: MessageSchema },
        },
      },
      async (request) => {
        await service.confirmPasswordReset(request.body.token, request.body.password);
        return { message: "Hasło zostało zmienione." };
      },
    );

    // Przykład trasy chronionej rolą — wzorzec RBAC (i cel testów).
    app.get(
      "/admin/ping",
      {
        preHandler: [app.authenticate, requireRoles("admin")],
        schema: { tags: ["auth"], response: { 200: MessageSchema } },
      },
      async () => ({ message: "pong (admin)" }),
    );
  };
}
