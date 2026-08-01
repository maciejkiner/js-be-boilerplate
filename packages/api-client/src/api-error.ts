/**
 * An API error as a real `Error`. Without this, consumers received the raw problem+json object, so
 * `error instanceof Error` was false and `error.message` was `undefined`. The effect: every view
 * showed a generic stand-in message instead of what the API had actually answered.
 *
 * The body shape is RFC 7807 (`type`, `title`, `status`, `detail`, `instance`) — see
 * `apps/api/src/lib/http/problem.ts`.
 */
export class ApiError extends Error {
  readonly status?: number;
  readonly title?: string;
  readonly detail?: string;
  readonly instance?: string;
  /**
   * The `errors` extension — errors attached to request FIELDS (validation 400, a uniqueness
   * conflict 409, 422). A form consumer maps them onto its fields through `serverErrorToFieldErrors`
   * from `@repo/forms`; without them only a global message is left.
   */
  readonly errors?: ApiFieldError[];
  /** The raw response body — for cases outside RFC 7807. */
  readonly body: unknown;

  constructor(body: unknown) {
    const problem = isProblem(body) ? body : undefined;
    // `detail` carries the text for the user ("Sala jest zajęta…"); `title` names the error class.
    super(problem?.detail ?? problem?.title ?? "Żądanie do API nie powiodło się.");
    this.name = "ApiError";
    this.status = problem?.status;
    this.title = problem?.title;
    this.detail = problem?.detail;
    this.instance = problem?.instance;
    this.errors = fieldErrorsOf(problem);
    this.body = body;
  }
}

/**
 * The error text for the user: `detail` from problem+json, or `fallback` when there is none (a
 * dropped network, say). For actions WITHOUT a form (delete, actions on a detail page), where a
 * toast is the only place an error can go:
 * `toast(errorMessage(error, "Nie udało się usunąć."), "error")`.
 *
 * `@repo/forms` has its own, identical function — deliberately, because the form engine does not
 * depend on the HTTP client (see `packages/forms/src/server-errors.ts`).
 */
export function errorMessage(
  error: unknown,
  fallback = "Żądanie do API nie powiodło się.",
): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** A single field error from problem+json (`path` matches the field path in the Zod schema). */
export interface ApiFieldError {
  path: string;
  message: string;
  code?: string;
}

interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: unknown;
}

/** Filters out foreign-shaped entries — `errors` is an extension, so we do not take it on trust. */
function fieldErrorsOf(problem: Problem | undefined): ApiFieldError[] | undefined {
  if (!Array.isArray(problem?.errors)) {
    return undefined;
  }
  const errors = problem.errors.filter(
    (entry): entry is ApiFieldError =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ApiFieldError).path === "string" &&
      typeof (entry as ApiFieldError).message === "string",
  );
  return errors.length > 0 ? errors : undefined;
}

function isProblem(body: unknown): body is Problem {
  return typeof body === "object" && body !== null;
}
