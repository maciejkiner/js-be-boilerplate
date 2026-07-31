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
  /**
   * Rozszerzenie `errors` — błędy przypisane do PÓL żądania (walidacja 400, konflikt unikalności
   * 409, 422). Konsument formularzy mapuje je na pola przez `serverErrorToFieldErrors`
   * z `@repo/forms`; bez nich zostaje wyłącznie komunikat globalny.
   */
  readonly errors?: ApiFieldError[];
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
    this.errors = fieldErrorsOf(problem);
    this.body = body;
  }
}

/**
 * Treść błędu dla użytkownika: `detail` z problem+json, a gdy go nie ma (np. zerwana sieć) —
 * `fallback`. Do akcji BEZ formularza (usuwanie, akcje na detalu), gdzie jedynym miejscem na błąd
 * jest toast: `toast(errorMessage(error, "Nie udało się usunąć."), "error")`.
 *
 * `@repo/forms` ma własną, identyczną funkcję — świadomie, bo silnik formularzy nie zależy od
 * klienta HTTP (patrz `packages/forms/src/server-errors.ts`).
 */
export function errorMessage(
  error: unknown,
  fallback = "Żądanie do API nie powiodło się.",
): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Błąd pojedynczego pola z problem+json (`path` zgodne ze ścieżką pola w schemacie Zod). */
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

/** Odsiewa wpisy o obcym kształcie — `errors` to rozszerzenie, więc nie ufamy mu na słowo. */
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
