import type { Env } from "../../config/env.js";
import { NoopErrorTracker } from "./noop.js";

/**
 * Abstrakcja raportowania błędów (vendor wymienny — spec sekcja 2/5).
 * Wpięta w globalny handler błędów: raportujemy tylko 5xx/nieoczekiwane.
 */
export interface ErrorTracker {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

/**
 * Wybiera adapter po konfiguracji: Sentry gdy `SENTRY_DSN` ustawiony, inaczej no-op.
 * `@sentry/node` ładowany leniwie, żeby dev/test bez DSN go nie inicjalizował.
 */
export async function createErrorTracker(env: Env): Promise<ErrorTracker> {
  if (env.SENTRY_DSN) {
    const { createSentryErrorTracker } = await import("./sentry.js");
    return createSentryErrorTracker(env.SENTRY_DSN, env.NODE_ENV);
  }
  return new NoopErrorTracker();
}
