import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import type { MemoryMailer } from "../src/lib/mailer/memory.js";
import { runMigrations } from "../src/db/migrate.js";
import { users } from "../src/modules/auth/auth.schema.js";
import { buildTestApp } from "./helpers.js";

const url = process.env.TEST_DATABASE_URL;
const CREDS = { email: "user@example.com", password: "password123" };

type InjectResponse = Awaited<ReturnType<FastifyInstance["inject"]>>;

function cookiesFrom(res: InjectResponse): Record<string, string> {
  const out: Record<string, string> = {};
  for (const cookie of res.cookies) {
    out[cookie.name] = cookie.value;
  }
  return out;
}

describe.skipIf(!url)("auth (email+hasło, sesje, RBAC, reset)", () => {
  let app: FastifyInstance;
  let db: Db;
  let pool: Pool;
  let mailer: MemoryMailer;

  beforeAll(async () => {
    ({ app, db, pool, mailer } = await buildTestApp());
    await runMigrations(db);
    await app.ready();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
    mailer.sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  async function register(creds = CREDS) {
    return app.inject({ method: "POST", url: "/api/v1/auth/register", payload: creds });
  }
  async function login(creds = CREDS) {
    return app.inject({ method: "POST", url: "/api/v1/auth/login", payload: creds });
  }

  it("register tworzy usera z domyślną rolą user", async () => {
    const res = await register();
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(CREDS.email);
    expect(body.user.roles).toEqual(["user"]);
  });

  it("register odrzuca duplikat e-maila (409)", async () => {
    await register();
    const res = await register();
    expect(res.statusCode).toBe(409);
  });

  it("login ustawia cookies access_token i refresh_token", async () => {
    await register();
    const res = await login();
    expect(res.statusCode).toBe(200);
    const cookies = cookiesFrom(res);
    expect(cookies.access_token).toBeTruthy();
    expect(cookies.refresh_token).toBeTruthy();
  });

  it("login odrzuca złe hasło (401)", async () => {
    await register();
    const res = await login({ email: CREDS.email, password: "wrong-password" });
    expect(res.statusCode).toBe(401);
  });

  it("/me wymaga uwierzytelnienia (401 bez, 200 z cookie)", async () => {
    await register();
    const cookies = cookiesFrom(await login());

    const unauth = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(unauth.statusCode).toBe(401);
    expect(unauth.headers["content-type"]).toContain("application/problem+json");

    const authed = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      cookies: { access_token: cookies.access_token! },
    });
    expect(authed.statusCode).toBe(200);
    expect(authed.json().email).toBe(CREDS.email);
  });

  it("refresh rotuje sesję: nowy refresh działa, stary już nie", async () => {
    await register();
    const first = cookiesFrom(await login());

    const refreshed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: first.refresh_token! },
    });
    expect(refreshed.statusCode).toBe(200);
    const rotated = cookiesFrom(refreshed);
    expect(rotated.refresh_token).toBeTruthy();
    expect(rotated.refresh_token).not.toBe(first.refresh_token);

    // stary refresh unieważniony
    const reuse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: first.refresh_token! },
    });
    expect(reuse.statusCode).toBe(401);
  });

  it("RBAC: /admin/ping 403 dla user, 200 dla admin", async () => {
    await register();
    const userCookies = cookiesFrom(await login());
    const forbidden = await app.inject({
      method: "GET",
      url: "/api/v1/auth/admin/ping",
      cookies: { access_token: userCookies.access_token! },
    });
    expect(forbidden.statusCode).toBe(403);

    // nadaj rolę admin i zaloguj ponownie (token osadza role przy logowaniu)
    await db
      .update(users)
      .set({ roles: ["admin", "user"] })
      .where(eq(users.email, CREDS.email));
    const adminCookies = cookiesFrom(await login());
    const ok = await app.inject({
      method: "GET",
      url: "/api/v1/auth/admin/ping",
      cookies: { access_token: adminCookies.access_token! },
    });
    expect(ok.statusCode).toBe(200);
  });

  it("reset hasła: request wysyła mail z tokenem, confirm zmienia hasło", async () => {
    await register();

    const requested = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password-reset/request",
      payload: { email: CREDS.email },
    });
    expect(requested.statusCode).toBe(202);
    expect(mailer.sent).toHaveLength(1);

    const match = /token=([a-f0-9]+)/.exec(mailer.sent[0]!.text);
    const token = match?.[1];
    expect(token).toBeTruthy();

    const confirmed = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password-reset/confirm",
      payload: { token, password: "new-password-456" },
    });
    expect(confirmed.statusCode).toBe(200);

    // stare hasło nie działa, nowe działa
    expect((await login()).statusCode).toBe(401);
    const relog = await login({ email: CREDS.email, password: "new-password-456" });
    expect(relog.statusCode).toBe(200);
  });

  it("reset hasła nie ujawnia istnienia konta (202 dla nieznanego e-maila)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/password-reset/request",
      payload: { email: "nieznany@example.com" },
    });
    expect(res.statusCode).toBe(202);
    expect(mailer.sent).toHaveLength(0);
  });

  it("logout czyści sesję (refresh po logout → 401)", async () => {
    await register();
    const cookies = cookiesFrom(await login());
    const out = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      cookies: { refresh_token: cookies.refresh_token! },
    });
    expect(out.statusCode).toBe(200);
    const reuse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: cookies.refresh_token! },
    });
    expect(reuse.statusCode).toBe(401);
  });
});
