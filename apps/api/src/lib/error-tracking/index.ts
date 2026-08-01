import type { Env } from "../../config/env.js";
import { NoopErrorTracker } from "./noop.js";

/**
 * The error-reporting abstraction (the vendor is replaceable — specification, sections 2 and 5).
 * Wired into the global error handler: we report only 5xx and unexpected errors.
 */
export interface ErrorTracker {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

/**
 * Picks the adapter from the configuration: Sentry when `SENTRY_DSN` is set, otherwise a no-op.
 * `@sentry/node` is loaded lazily so that dev and test runs without a DSN never initialise it.
 */
export async function createErrorTracker(env: Env): Promise<ErrorTracker> {
  if (env.SENTRY_DSN) {
    const { createSentryErrorTracker } = await import("./sentry.js");
    return createSentryErrorTracker(env.SENTRY_DSN, env.NODE_ENV);
  }
  return new NoopErrorTracker();
}
