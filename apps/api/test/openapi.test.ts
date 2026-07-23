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

describe("GET /api/v1/openapi.json", () => {
  it("serwuje spec OpenAPI wygenerowany ze schematów Zod", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/openapi.json" });
    expect(res.statusCode).toBe(200);
    const doc = res.json();
    expect(doc.openapi).toMatch(/^3\./);
    expect(doc.paths["/health"]).toBeDefined();
  });
});
