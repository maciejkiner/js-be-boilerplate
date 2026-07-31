/**
 * Błąd API jako prawdziwy `Error`. Bez tego konsumenci dostawali surowy obiekt problem+json,
 * więc `error instanceof Error` było fałszem, a `error.message` — `undefined`. Efekt: każdy widok
 * pokazywał ogólny komunikat zastępczy zamiast tego, co odpowiedziało API.
 *
 * Kształt ciała: RFC 7807 (`type`, `title`, `status`, `detail`, `instance`) — patrz
 * `apps/api/src/lib/http/problem.ts`.
 */
export class ApiError extends Error {
  readonly status?: number;
  readonly title?: string;
  readonly detail?: string;
  readonly instance?: string;
  /** Surowe ciało odpowiedzi — dla przypadków spoza RFC 7807. */
  readonly body: unknown;

  constructor(body: unknown) {
    const problem = isProblem(body) ? body : undefined;
    // `detail` niesie treść dla użytkownika („Sala jest zajęta…"), `title` to nazwa klasy błędu.
    super(problem?.detail ?? problem?.title ?? "Żądanie do API nie powiodło się.");
    this.name = "ApiError";
    this.status = problem?.status;
    this.title = problem?.title;
    this.detail = problem?.detail;
    this.instance = problem?.instance;
    this.body = body;
  }
}

interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

function isProblem(body: unknown): body is Problem {
  return typeof body === "object" && body !== null;
}
