import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import type { MemoryMailer } from "../src/lib/mailer/memory.js";
import { users } from "../src/modules/auth/auth.schema.js";
import { buildTestApp } from "./helpers.js";

const url = process.env.TEST_DATABASE_URL;
const CREDS = { email: "owner@example.com", password: "password123" };

/**
 * The backend behind the forms and the wizard: invitations go to the mailer (NOT the database) — the proof of separation
 * handlers; the user list (admin RBAC) is the source for the `assignee` relation fields.
 */
describe.skipIf(!url)("Faza 7 BE: zaproszenia (mailer) + lista userów", () => {
  let app: FastifyInstance;
  let db: Db;
  let pool: Pool;
  let mailer: MemoryMailer;
  let accessToken: string;

  beforeAll(async () => {
    ({ app, db, pool, mailer } = await buildTestApp());
    await runMigrations(db);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users, projects, tasks CASCADE`);
    mailer.sent.length = 0;
    await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDS });
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: CREDS });
    accessToken = login.cookies.find((c) => c.name === "access_token")!.value;
  });

  const auth = () => ({ access_token: accessToken });

  async function loginAsAdmin() {
    await db
      .update(users)
      .set({ roles: ["admin", "user"] })
      .where(eq(users.email, CREDS.email));
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: CREDS });
    return login.cookies.find((c) => c.name === "access_token")!.value;
  }

  async function createProject() {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      cookies: auth(),
      payload: { name: "P", status: "active", startDate: "2026-01-01", endDate: "2026-06-01" },
    });
    return res.json();
  }

  it("zaproszenia idą do mailera (202), NIE do bazy", async () => {
    const project = await createProject();
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.id}/invitations`,
      cookies: auth(),
      payload: { emails: ["a@example.com", "b@example.com"] },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json().invited).toBe(2);
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.sent[0]!.subject).toContain("Zaproszenie");
  });

  it("zaproszenia dla nieistniejącego projektu → 404", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects/00000000-0000-0000-0000-000000000000/invitations",
      cookies: auth(),
      payload: { emails: ["a@example.com"] },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /users: 403 dla usera, 200 dla admina (id + email)", async () => {
    const forbidden = await app.inject({ method: "GET", url: "/api/v1/users", cookies: auth() });
    expect(forbidden.statusCode).toBe(403);

    const adminToken = await loginAsAdmin();
    const ok = await app.inject({
      method: "GET",
      url: "/api/v1/users",
      cookies: { access_token: adminToken },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().items[0]).toHaveProperty("email");
  });

  it("GET /users?q= filtruje po e-mailu", async () => {
    const adminToken = await loginAsAdmin();
    const match = await app.inject({
      method: "GET",
      url: "/api/v1/users?q=owner",
      cookies: { access_token: adminToken },
    });
    expect(match.json().meta.total).toBeGreaterThanOrEqual(1);

    const none = await app.inject({
      method: "GET",
      url: "/api/v1/users?q=zzz-nomatch",
      cookies: { access_token: adminToken },
    });
    expect(none.json().meta.total).toBe(0);
  });
});
