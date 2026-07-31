import type { FastifyInstance } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { uniqueConflictError } from "../src/db/unique-violation.js";
import { NotFoundError } from "../src/lib/http/problem.js";
import { buildTestApp, recordingTracker } from "./helpers.js";

const testRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/__test/not-found", async () => {
    throw new NotFoundError("Brak zasobu X");
  });
  app.get("/__test/boom", async () => {
    throw new Error("nieoczekiwany szczegół wewnętrzny");
  });
  app.post(
    "/__test/echo",
    { schema: { body: z.object({ name: z.string().min(1) }) } },
    async (request) => request.body,
  );
  app.get("/__test/conflict", async () => {
    throw uniqueConflictError("Event", ["slug"]);
  });
  app.get("/__test/conflict-composite", async () => {
    throw uniqueConflictError("Registration", ["eventId", "email"]);
  });
};

const { tracker, captured } = recordingTracker();
let app: FastifyInstance;
let pool: Pool;

beforeAll(async () => {
  ({ app, pool } = await buildTestApp({ errorTracker: tracker }));
  await app.register(testRoutes);
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("globalny handler błędów (RFC 7807)", () => {
  it("AppError → problem+json ze statusem, tytułem i instance", async () => {
    const res = await app.inject({ method: "GET", url: "/__test/not-found" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.status).toBe(404);
    expect(body.title).toBe("Not Found");
    expect(body.detail).toBe("Brak zasobu X");
    expect(body.instance).toBe("/__test/not-found");
  });

  it("nieoczekiwany błąd → 500 bez wycieku detali + raport do trackera", async () => {
    const before = captured.length;
    const res = await app.inject({ method: "GET", url: "/__test/boom" });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.title).toBe("Internal Server Error");
    expect(body.detail).toBeUndefined();
    expect(captured.length).toBe(before + 1);
  });

  it("walidacja żądania → 400 z listą errors", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/__test/echo",
      payload: { name: "" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.status).toBe(400);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("konflikt unikalności → 409 z polami w `errors` (formularz podświetli kontrolkę)", async () => {
    const res = await app.inject({ method: "GET", url: "/__test/conflict" });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.title).toBe("Conflict");
    expect(body.detail).toBe("Event: wartości (slug) muszą być unikalne.");
    expect(body.errors).toEqual([{ path: "slug", message: "Ta wartość jest już zajęta." }]);
  });

  it("konflikt złożony → `errors` wskazuje każde pole kombinacji", async () => {
    const res = await app.inject({ method: "GET", url: "/__test/conflict-composite" });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.detail).toBe("Registration: wartości (eventId, email) muszą być unikalne.");
    expect(body.errors.map((entry: { path: string }) => entry.path)).toEqual(["eventId", "email"]);
    expect(body.errors[0].message).toContain("kombinacja");
  });

  it("nieznana trasa → 404 problem+json", async () => {
    const res = await app.inject({ method: "GET", url: "/nie-ma-takiej" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().status).toBe(404);
  });
});
