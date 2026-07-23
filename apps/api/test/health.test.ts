import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { NoopErrorTracker } from "../src/lib/error-tracking/noop.js";
import { testEnv } from "./helpers.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ env: testEnv(), errorTracker: new NoopErrorTracker() });
  await app.ready();
});

afterAll(async () => {
  await app.close();
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
