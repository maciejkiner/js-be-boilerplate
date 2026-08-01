import { ConflictError, type ProblemFieldError } from "../lib/http/problem.js";

/** The Postgres error code for a unique constraint violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Returns the name of the violated unique constraint, or `undefined` for any other kind of error.
 * The scaffolder generates unique index names deterministically, so a module can tell from the name
 * WHICH fields collided and answer with a specific 409.
 */
export function uniqueViolationConstraint(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { code, constraint } = error as { code?: unknown; constraint?: unknown };
  if (code !== UNIQUE_VIOLATION || typeof constraint !== "string") {
    return undefined;
  }
  return constraint;
}

/**
 * A uniqueness conflict → a 409 with the `errors` extension, that is the list of FIELDS that
 * collided.
 *
 * A human reads `detail`, a form reads `errors`: without that list the client knows the field name
 * only from the sentence in `detail` and has no way to highlight the control that needs fixing.
 */
export function uniqueConflictError(label: string, fields: string[]): ConflictError {
  const detail = `${label}: wartości (${fields.join(", ")}) muszą być unikalne.`;
  const message =
    fields.length === 1
      ? "Ta wartość jest już zajęta."
      : `Ta kombinacja pól (${fields.join(", ")}) jest już zajęta.`;
  const errors: ProblemFieldError[] = fields.map((path) => ({ path, message }));
  return new ConflictError(detail, { errors });
}
