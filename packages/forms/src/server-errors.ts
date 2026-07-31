import type { FormErrors } from "./use-form.js";

/** The key for an error that belongs to no field (cross-field validation, a global message). */
export const FORM_ERROR_KEY = "_form";

/** How many `cause` levels we search before deciding the error carries no field information. */
const MAX_CAUSE_DEPTH = 3;

interface FieldIssueLike {
  path?: unknown;
  message?: unknown;
}

/**
 * An API error response → per-field form errors.
 *
 * It reads the `errors` extension of problem+json (`[{ path, message }]`), which the API sends for
 * schema validation (400), uniqueness conflicts (409) and 422. Without this step the field name
 * lives only inside the `detail` sentence, so the UI can show a global message at best and the user
 * has to guess which control to fix.
 *
 * The shape is recognised **structurally**, not through `instanceof ApiError`: `@repo/forms` is
 * headless and independent of the transport — the same mapper handles an error from
 * `@repo/api-client`, from another HTTP client, and a wrapped one (`cause`), for example from
 * `WizardStepError`.
 */
export function serverErrorToFieldErrors(error: unknown): FormErrors {
  const result: FormErrors = {};
  for (const issue of fieldIssuesOf(error, 0)) {
    // The first message wins — consistent with `zodErrorsToFieldErrors`.
    const key = issue.path === "" ? FORM_ERROR_KEY : issue.path;
    if (!(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}

/** The message to show the user; `ApiError.message` carries `detail` from problem+json. */
export function errorMessage(error: unknown, fallback = "Operacja nie powiodła się."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/** Finds the list of field errors on the error itself or along its `cause` chain. */
function fieldIssuesOf(error: unknown, depth: number): { path: string; message: string }[] {
  if (depth > MAX_CAUSE_DEPTH || typeof error !== "object" || error === null) {
    return [];
  }
  const { errors, cause } = error as { errors?: unknown; cause?: unknown };
  if (Array.isArray(errors)) {
    // We require `path` to be a string so that `AggregateError.errors` (a list of exceptions, not of
    // fields) or another extension with a coincidentally matching name cannot be pulled in here.
    const issues = (errors as FieldIssueLike[]).filter(
      (issue): issue is { path: string; message: string } =>
        typeof issue === "object" &&
        issue !== null &&
        typeof issue.path === "string" &&
        typeof issue.message === "string" &&
        issue.message.length > 0,
    );
    if (issues.length > 0) {
      return issues;
    }
  }
  return fieldIssuesOf(cause, depth + 1);
}
