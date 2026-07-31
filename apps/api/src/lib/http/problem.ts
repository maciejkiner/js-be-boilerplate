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
 * Element rozszerzenia `errors`: błąd przypisany do konkretnego POLA żądania.
 *
 * Ten sam kształt dla walidacji schematu (400) i konfliktu unikalności (409) — dzięki temu klient ma
 * jedną ścieżkę mapowania odpowiedzi błędu na pola formularza (`serverErrorToFieldErrors`
 * w `@repo/forms`). Bez tego `detail` niesie nazwę pola tylko w zdaniu, którego UI nie umie
 * rozłożyć, więc użytkownik dostaje komunikat globalny i sam musi szukać, co poprawić.
 */
export interface ProblemFieldError {
  /** Ścieżka pola zgodna z `issue.path` Zoda (`"slug"`, `"address.city"`); pusta = błąd całości. */
  path: string;
  message: string;
  code?: string;
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
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({ status: 409, title: "Conflict", detail, extensions });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(detail?: string, extensions?: Record<string, unknown>) {
    super({ status: 422, title: "Unprocessable Entity", detail, extensions });
  }
}
