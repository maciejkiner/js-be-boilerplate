import { type Env, parseEnv } from "../src/config/env.js";
import type { ErrorTracker } from "../src/lib/error-tracking/index.js";

/** Poprawny env dla testów (bez czytania process.env). */
export function testEnv(overrides: Record<string, string> = {}): Env {
  return parseEnv({
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    DATABASE_URL: "postgres://app:app@localhost:5432/app",
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
