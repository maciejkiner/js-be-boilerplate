import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { buildTestApp } from "./helpers.js";

const url = process.env.TEST_DATABASE_URL;
const CREDS = { email: "owner@example.com", password: "password123" };

/**
 * The reference entity slice: it proves that one source of truth (the schema plus the metadata in
 * @repo/schemas) yields working CRUD with pagination, filters,
 * sorting, validation (cross-field included), soft delete, `createdBy` and relations
 * generated→generated (projectId) and generated→core (assigneeId → users).
 */
describe.skipIf(!url)("encje referencyjne: projects + tasks", () => {
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
    await db.execute(sql`TRUNCATE TABLE users, projects, tasks CASCADE`);
    const reg = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: CREDS });
    userId = reg.json().user.id;
    const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: CREDS });
    accessToken = login.cookies.find((c) => c.name === "access_token")!.value;
  });

  const authCookies = () => ({ access_token: accessToken });

  function createProject(overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: "POST",
      url: "/api/v1/projects",
      cookies: authCookies(),
      payload: {
        name: "Website revamp",
        description: "Q3 marketing site",
        status: "active",
        startDate: "2026-01-01",
        endDate: "2026-06-01",
        ...overrides,
      },
    });
  }

  function createTask(projectId: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      cookies: authCookies(),
      payload: {
        title: "Design homepage",
        status: "todo",
        priority: "medium",
        isBlocked: false,
        projectId,
        ...overrides,
      },
    });
  }

  describe("projects (CRUD, walidacja, paginacja/filtry/sort, soft delete)", () => {
    it("wymaga uwierzytelnienia (401 bez cookie)", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/projects" });
      expect(res.statusCode).toBe(401);
      expect(res.headers["content-type"]).toContain("application/problem+json");
    });

    it("create zwraca 201 i ustawia createdBy z sesji", async () => {
      const res = await createProject();
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.createdBy).toBe(userId);
      expect(body.status).toBe("active");
    });

    it("odrzuca endDate < startDate walidacją międzypolową (400)", async () => {
      const res = await createProject({ startDate: "2026-06-01", endDate: "2026-01-01" });
      expect(res.statusCode).toBe(400);
      expect(res.headers["content-type"]).toContain("application/problem+json");
    });

    it("list: paginacja, filtr po statusie i sort po nazwie", async () => {
      await createProject({ name: "Alpha", status: "active" });
      await createProject({ name: "Beta", status: "archived" });
      await createProject({ name: "Gamma", status: "active" });

      const page = await app.inject({
        method: "GET",
        url: "/api/v1/projects?pageSize=2&page=1&sort=name&order=asc",
        cookies: authCookies(),
      });
      expect(page.statusCode).toBe(200);
      const body = page.json();
      expect(body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
      expect(body.items).toHaveLength(2);
      expect(body.items.map((p: { name: string }) => p.name)).toEqual(["Alpha", "Beta"]);

      const filtered = await app.inject({
        method: "GET",
        url: "/api/v1/projects?status=active",
        cookies: authCookies(),
      });
      expect(filtered.json().meta.total).toBe(2);
    });

    it("get zwraca 404 dla nieistniejącego id", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/projects/00000000-0000-0000-0000-000000000000",
        cookies: authCookies(),
      });
      expect(res.statusCode).toBe(404);
    });

    it("patch aktualizuje pola", async () => {
      const created = (await createProject()).json();
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/projects/${created.id}`,
        cookies: authCookies(),
        payload: { status: "archived" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("archived");
    });

    it("delete jest miękkie: po usunięciu get→404 i znika z listy", async () => {
      const created = (await createProject()).json();
      const del = await app.inject({
        method: "DELETE",
        url: `/api/v1/projects/${created.id}`,
        cookies: authCookies(),
      });
      expect(del.statusCode).toBe(200);

      const get = await app.inject({
        method: "GET",
        url: `/api/v1/projects/${created.id}`,
        cookies: authCookies(),
      });
      expect(get.statusCode).toBe(404);

      const list = await app.inject({
        method: "GET",
        url: "/api/v1/projects",
        cookies: authCookies(),
      });
      expect(list.json().meta.total).toBe(0);
    });
  });

  describe("tasks (relacje, walidacja FK, filtry)", () => {
    it("create z relacjami project (generator→generator) i assignee (generator→core)", async () => {
      const project = (await createProject()).json();
      const res = await createTask(project.id, { assigneeId: userId, priority: "high" });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.projectId).toBe(project.id);
      expect(body.assigneeId).toBe(userId);
      expect(body.createdBy).toBe(userId);
    });

    it("odrzuca nieistniejący projectId (400)", async () => {
      const res = await createTask("00000000-0000-0000-0000-000000000000");
      expect(res.statusCode).toBe(400);
    });

    it("odrzuca nieistniejący assigneeId (400)", async () => {
      const project = (await createProject()).json();
      const res = await createTask(project.id, {
        assigneeId: "00000000-0000-0000-0000-000000000000",
      });
      expect(res.statusCode).toBe(400);
    });

    it("list filtruje po statusie, priorytecie i projekcie", async () => {
      const a = (await createProject({ name: "A" })).json();
      const b = (await createProject({ name: "B" })).json();
      await createTask(a.id, { status: "todo", priority: "high" });
      await createTask(a.id, { status: "done", priority: "low" });
      await createTask(b.id, { status: "todo", priority: "low" });

      const byProject = await app.inject({
        method: "GET",
        url: `/api/v1/tasks?projectId=${a.id}`,
        cookies: authCookies(),
      });
      expect(byProject.json().meta.total).toBe(2);

      const byStatus = await app.inject({
        method: "GET",
        url: "/api/v1/tasks?status=todo",
        cookies: authCookies(),
      });
      expect(byStatus.json().meta.total).toBe(2);

      const byPriority = await app.inject({
        method: "GET",
        url: "/api/v1/tasks?priority=high",
        cookies: authCookies(),
      });
      expect(byPriority.json().meta.total).toBe(1);
    });

    it("delete jest miękkie", async () => {
      const project = (await createProject()).json();
      const task = (await createTask(project.id)).json();
      const del = await app.inject({
        method: "DELETE",
        url: `/api/v1/tasks/${task.id}`,
        cookies: authCookies(),
      });
      expect(del.statusCode).toBe(200);
      const get = await app.inject({
        method: "GET",
        url: `/api/v1/tasks/${task.id}`,
        cookies: authCookies(),
      });
      expect(get.statusCode).toBe(404);
    });
  });
});
