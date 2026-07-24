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

describe("CORS (web + admin na dwóch originach)", () => {
  it("dopuszcza origin web z credentials", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:5173" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("dopuszcza origin admin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://localhost:5174" },
    });
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
  });

  it("nie odbija nieznanego originu", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://evil.example.com" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
