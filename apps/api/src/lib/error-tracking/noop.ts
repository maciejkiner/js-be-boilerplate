import type { ErrorTracker } from "./index.js";

/**
 * The dev/test adapter, with no external vendor. The error is logged by the global handler (pino)
 * anyway — here we deliberately do nothing more.
 */
export class NoopErrorTracker implements ErrorTracker {
  captureException(): void {
    // celowo puste
  }
}
