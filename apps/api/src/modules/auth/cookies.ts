import type { FastifyReply } from "fastify";
import type { Env } from "../../config/env.js";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
// Refresh cookie tylko dla tras auth — nie wędruje z każdym żądaniem.
const REFRESH_PATH = "/api/v1/auth";

function baseCookieOptions(env: Env) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
  };
}

export function setAuthCookies(
  reply: FastifyReply,
  env: Env,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const base = baseCookieOptions(env);
  reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60,
  });
  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookies(reply: FastifyReply, env: Env): void {
  const base = baseCookieOptions(env);
  reply.clearCookie(ACCESS_COOKIE, base);
  reply.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
}

export function readRefreshCookie(cookies: Record<string, string | undefined>): string | undefined {
  return cookies[REFRESH_COOKIE];
}
