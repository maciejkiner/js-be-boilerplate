import * as Sentry from "@sentry/node";
import type { ErrorTracker } from "./index.js";

/**
 * Adapter produkcyjny. Vendor jest wymienny — zależność od `@sentry/node`
 * żyje wyłącznie w tym pliku, importowanym leniwie tylko gdy `SENTRY_DSN` ustawiony.
 */
export function createSentryErrorTracker(dsn: string, environment: string): ErrorTracker {
  Sentry.init({ dsn, environment });

  return {
    captureException(error, context) {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    },
  };
}
