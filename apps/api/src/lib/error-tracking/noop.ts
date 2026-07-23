import type { ErrorTracker } from "./index.js";

/**
 * Adapter dev/test bez zewnętrznego vendora. Błąd jest i tak logowany przez
 * globalny handler (pino) — tu celowo nie robimy nic więcej.
 */
export class NoopErrorTracker implements ErrorTracker {
  captureException(): void {
    // celowo puste
  }
}
