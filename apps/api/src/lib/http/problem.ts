/**
 * RFC 7807 (problem+json). One consistent error response shape across the whole API.
 */
export const PROBLEM_CONTENT_TYPE = "application/problem+json";

export interface ProblemDetails {
  /** A URI identifying the problem type; `about:blank` when the status alone is enough. */
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** The path of the request the error concerns. */
  instance?: string;
  /** Extension members (`errors` on validation, for example). */
  [key: string]: unknown;
}

/**
 * An entry of the `errors` extension: an error attached to a specific request FIELD.
 *
 * The same shape for schema validation (400) and a uniqueness conflict (409), which gives the client
 * one path for mapping an error response onto form fields (`serverErrorToFieldErrors` in
 * `@repo/forms`). Without it, `detail` carries the field name only inside a sentence the UI cannot
 * decompose, so the user gets a global message and has to work out what to fix.
 */
export interface ProblemFieldError {
  /** The field path following Zod's `issue.path` (`"slug"`, `"address.city"`); empty = the whole body. */
  path: string;
  message: string;
  code?: string;
}

/**
 * The base domain error, mapped to problem+json by the global handler.
 * Throw its subclasses from the service layer — never format an error response by hand.
 */
export class AppError extends Error {
  readonly status: number;
  readonly title: string;
  readonly type: string;
  readonly detail?: string;
  readonly extensions?: Record<string, unknown>;

  constructor(args: {
    status: number;
    title: string;
    type?: string;
    detail?: string;
    extensions?: Record<string, unknown>;
  }) {
    super(args.detail ?? args.title);
    this.name = new.target.name;
    this.status = args.status;
    this.title = args.title;
    this.type = args.type ?? "about:blank";
    this.detail = args.detail;
    this.extensions = args.extensions;
  }
}

export class BadRequestError extends AppError {
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({ status: 400, title: "Bad Request", detail, extensions });
  }
}

export class UnauthorizedError extends AppError {
  constructor(detail?: string) {
    super({ status: 401, title: "Unauthorized", detail });
  }
}

export class ForbiddenError extends AppError {
  constructor(detail?: string) {
    super({ status: 403, title: "Forbidden", detail });
  }
}

export class NotFoundError extends AppError {
  constructor(detail?: string) {
    super({ status: 404, title: "Not Found", detail });
  }
}

export class ConflictError extends AppError {
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({ status: 409, title: "Conflict", detail, extensions });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({ status: 422, title: "Unprocessable Entity", detail, extensions });
  }
}
