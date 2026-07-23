/**
 * RFC 7807 (problem+json). Jeden spójny kształt odpowiedzi błędu w całym API.
 */
export const PROBLEM_CONTENT_TYPE = "application/problem+json";

export interface ProblemDetails {
  /** URI identyfikujący typ problemu; `about:blank` gdy wystarcza sam status. */
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** Ścieżka żądania, którego dotyczy błąd. */
  instance?: string;
  /** Członkowie rozszerzeń (np. `errors` przy walidacji). */
  [key: string]: unknown;
}

/**
 * Bazowy błąd domenowy mapowany na problem+json przez globalny handler.
 * Rzucaj podklasy z warstwy service — nigdy nie formatuj odpowiedzi błędu ręcznie.
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
  constructor(detail?: string) {
    super({ status: 409, title: "Conflict", detail });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({ status: 422, title: "Unprocessable Entity", detail, extensions });
  }
}
