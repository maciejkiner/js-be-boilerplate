import * as Sentry from "@sentry/node";
import type { ErrorTracker } from "./index.js";

/**
 * The production adapter. The vendor is replaceable — the `@sentry/node` dependency lives in this
 * file alone, imported lazily and only when `SENTRY_DSN` is set.
 */
export function createSentryErrorTracker(dsn: string, environment: string): ErrorTracker {
  Sentry.init({ dsn, environment });

  return {
    captureException(error, context) {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    },
  };
}
