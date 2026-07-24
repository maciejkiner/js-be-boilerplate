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

describe("GET /health", () => {
  it("zwraca 200 i status ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });

  it("odsyła nagłówek x-request-id (correlation id)", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-request-id"]).toBeTruthy();
  });
});
