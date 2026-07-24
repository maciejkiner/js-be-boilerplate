import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { buildApp } from "../src/app.js";
import { type Env, parseEnv } from "../src/config/env.js";
import { type Db, createDb } from "../src/db/client.js";
import type { ErrorTracker } from "../src/lib/error-tracking/index.js";
import { NoopErrorTracker } from "../src/lib/error-tracking/noop.js";
import { MemoryMailer } from "../src/lib/mailer/memory.js";

/** Poprawny env dla testów (bez czytania realnego process.env poza TEST_DATABASE_URL). */
export function testEnv(overrides: Record<string, string> = {}): Env {
  return parseEnv({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
    JWT_SECRET: "test-secret-please-change-32-characters-long",
    ...overrides,
  } as NodeJS.ProcessEnv);
}

/** Tracker nagrywający wywołania — do asercji, że 5xx są raportowane. */
export function recordingTracker(): { tracker: ErrorTracker; captured: unknown[] } {
  const captured: unknown[] = [];
  return {
    captured,
    tracker: {
      captureException(error) {
        captured.push(error);
      },
    },
  };
}

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  pool: Pool;
  mailer: MemoryMailer;
  env: Env;
}

/** Buduje pełną aplikację testową (mailer in-memory). Pamiętaj o `pool.end()` w afterAll. */
export async function buildTestApp(overrides?: {
  errorTracker?: ErrorTracker;
  env?: Env;
}): Promise<TestApp> {
  const env = overrides?.env ?? testEnv();
  const errorTracker = overrides?.errorTracker ?? new NoopErrorTracker();
  const { db, pool } = createDb(env.DATABASE_URL);
  const mailer = new MemoryMailer();
  const app = await buildApp({ env, errorTracker, db, mailer });
  return { app, db, pool, mailer, env };
}
