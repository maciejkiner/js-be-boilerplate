import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTestApp } from "./helpers.js";

let app: FastifyInstance;
let pool: Pool;

beforeAll(async () => {
  ({ app, pool } = await buildTestApp());
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("GET /api/v1/openapi.json", () => {
  it("serwuje spec OpenAPI wygenerowany ze schematów Zod", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.paths["/health"]).toBeDefined();
    expect(doc.paths["/api/v1/auth/login"]).toBeDefined();
  });
});
