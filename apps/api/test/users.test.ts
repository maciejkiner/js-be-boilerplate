import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { users } from "../src/modules/auth/auth.schema.js";
import type { MemoryMailer } from "../src/lib/mailer/memory.js";
import { buildTestApp } from "./helpers.js";

const url = process.env.TEST_DATABASE_URL;
const ADMIN = { email: "admin-mgr@example.com", password: "password123" };
const MEMBER = { email: "member@example.com", password: "password123" };

/** Zarządzanie użytkownikami (panel admina) — bramka roli, zaproszenia, role, dezaktywacja. */
describe.skipIf(!url)("users management (admin)", () => {
  let app: FastifyInstance;
  let db: Db;
  let pool: Pool;
  let mailer: MemoryMailer;
  let adminCookie: string;
  let memberCookie: string;
  let adminId: string;
  let memberId: string;

  beforeAll(async () => {
    ({ app, db, pool, mailer } = await buildTestApp());
    await runMigrations(db);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  async function register(creds: typeof ADMIN): Promise<string> {
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: creds });
    return res.json().user.id;
  }
  async function login(creds: typeof ADMIN) {
    return app.inject({ method: "POST", url: "/api/v1/auth/login", payload: creds });
  }
  const cookieOf = (res: Awaited<ReturnType<typeof login>>) =>
    res.cookies.find((c) => c.name === "access_token")!.value;
  const admin = () => ({ access_token: adminCookie });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
    adminId = await register(ADMIN);
    // Awans do admina w bazie, dopiero potem login — token nosi role z chwili wydania.
    await db
      .update(users)
      .set({ roles: ["admin", "user"] })
      .where(eq(users.id, adminId));
    adminCookie = cookieOf(await login(ADMIN));
    memberId = await register(MEMBER);
    memberCookie = cookieOf(await login(MEMBER));
  });

  it("nie-admin dostaje 403 na endpointach zarządzania", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      cookies: { access_token: memberCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it("zaproszenie tworzy usera (201) i wysyła e-mail; duplikat = 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      cookies: admin(),
      payload: { email: "invited@example.com", roles: ["user"] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().active).toBe(true);
    expect(mailer.sent.some((m) => m.to === "invited@example.com")).toBe(true);

    const dup = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      cookies: admin(),
      payload: { email: "invited@example.com", roles: ["user"] },
    });
    expect(dup.statusCode).toBe(409);
  });

  it("zmiana ról działa, ale admin nie odbierze sobie roli admina (400)", async () => {
    const promote = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${memberId}/roles`,
      cookies: admin(),
      payload: { roles: ["admin", "user"] },
    });
    expect(promote.statusCode).toBe(200);
    expect(promote.json().roles).toContain("admin");

    const selfLock = await app.inject({
      method: "PATCH",
      url: `/api/v1/users/${adminId}/roles`,
      cookies: admin(),
      payload: { roles: ["user"] },
    });
    expect(selfLock.statusCode).toBe(400);
  });

  it("dezaktywacja: nie na sobie (400); member znika z aktywnych i nie może się zalogować", async () => {
    const self = await app.inject({
      method: "POST",
      url: `/api/v1/users/${adminId}/deactivate`,
      cookies: admin(),
    });
    expect(self.statusCode).toBe(400);

    const deactivate = await app.inject({
      method: "POST",
      url: `/api/v1/users/${memberId}/deactivate`,
      cookies: admin(),
    });
    expect(deactivate.statusCode).toBe(200);
    expect(deactivate.json().active).toBe(false);

    // Soft-delete egzekwowany przez auth — dezaktywowany user się nie zaloguje.
    expect((await login(MEMBER)).statusCode).toBe(401);

    const active = await app.inject({
      method: "GET",
      url: "/api/v1/users?status=active",
      cookies: admin(),
    });
    expect(active.json().items.some((u: { id: string }) => u.id === memberId)).toBe(false);
    const inactive = await app.inject({
      method: "GET",
      url: "/api/v1/users?status=inactive",
      cookies: admin(),
    });
    expect(inactive.json().items.some((u: { id: string }) => u.id === memberId)).toBe(true);

    // Reaktywacja przywraca logowanie.
    const reactivate = await app.inject({
      method: "POST",
      url: `/api/v1/users/${memberId}/reactivate`,
      cookies: admin(),
    });
    expect(reactivate.statusCode).toBe(200);
    expect((await login(MEMBER)).statusCode).toBe(200);
  });
});
