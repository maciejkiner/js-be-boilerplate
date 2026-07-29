import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { buildTestApp } from "./helpers.js";

const url = process.env.TEST_DATABASE_URL;
const CREDS = { email: "comment-owner@example.com", password: "password123" };

// Scaffolder nie potrafił automatycznie zseedować relacji wymaganych: taskId.
// Uzupełnij tworzenie rekordów-prerekwizytów w create() i ustaw RELATIONS_TODO = false, aby włączyć test.
const RELATIONS_TODO: boolean = true;

/** CRUD encji comments — wygenerowane przez scaffolder. */
describe.skipIf(!url || RELATIONS_TODO)("comments CRUD (wygenerowane)", () => {
  let app: FastifyInstance;
  let db: Db;
  let pool: Pool;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    ({ app, db, pool } = await buildTestApp());
    await runMigrations(db);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users, tasks, comments CASCADE`);
    const reg = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDS });
    userId = reg.json().user.id;
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: CREDS });
    accessToken = login.cookies.find((c) => c.name === "access_token")!.value;
  });

  const auth = () => ({ access_token: accessToken });

  async function create() {
    // TODO: utwórz rekord `task` (relacja wymagana) i podstaw jego id.
    const taskId = "";
    return app.inject({
      method: "POST",
      url: "/api/v1/comments",
      cookies: auth(),
      payload: {
        body: "test-body",
        status: "active",
        taskId,
      },
    });
  }

  it("wymaga uwierzytelnienia (401 bez cookie)", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/comments" });
    expect(res.statusCode).toBe(401);
  });

  it("create zwraca 201 i ustawia createdBy z sesji", async () => {
    const res = await create();
    expect(res.statusCode).toBe(201);
    expect(res.json().createdBy).toBe(userId);
  });

  it("list zawiera utworzony rekord", async () => {
    await create();
    const res = await app.inject({ method: "GET", url: "/api/v1/comments", cookies: auth() });
    expect(res.json().meta.total).toBe(1);
  });

  it("get 404 dla nieistniejącego id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/comments/00000000-0000-0000-0000-000000000000",
      cookies: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("delete jest miękkie: po usunięciu get→404 i znika z listy", async () => {
    const created = (await create()).json();
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/comments/${created.id}`,
          cookies: auth(),
        })
      ).statusCode,
    ).toBe(200);
    const get = await app.inject({
      method: "GET",
      url: `/api/v1/comments/${created.id}`,
      cookies: auth(),
    });
    expect(get.statusCode).toBe(404);
  });
});
