import type { FormErrors } from "./use-form.js";

/** Klucz błędu, który nie należy do żadnego pola (walidacja międzypolowa, komunikat globalny). */
export const FORM_ERROR_KEY = "_form";

/** Ile poziomów `cause` przeszukujemy, zanim uznamy, że błąd nie niesie informacji o polach. */
const MAX_CAUSE_DEPTH = 3;

interface FieldIssueLike {
  path?: unknown;
  message?: unknown;
}

/**
 * Odpowiedź błędu z API → błędy per pole formularza.
 *
 * Czyta rozszerzenie `errors` z problem+json (`[{ path, message }]`), które API wysyła przy
 * walidacji schematu (400), konflikcie unikalności (409) i 422. Bez tego kroku nazwa pola siedzi
 * wyłącznie w zdaniu `detail`, więc UI umie pokazać co najwyżej komunikat globalny, a użytkownik
 * sam musi zgadnąć, którą kontrolkę poprawić.
 *
 * Rozpoznajemy kształt **strukturalnie**, nie przez `instanceof ApiError`: `@repo/forms` jest
 * headless i nie zależy od transportu — ten sam mapper obsłuży błąd z `@repo/api-client`, z innego
 * klienta HTTP i błąd opakowany (`cause`), np. przez `WizardStepError`.
 */
export function serverErrorToFieldErrors(error: unknown): FormErrors {
  const result: FormErrors = {};
  for (const issue of fieldIssuesOf(error, 0)) {
    // Pierwszy komunikat wygrywa — spójnie z `zodErrorsToFieldErrors`.
    const key = issue.path === "" ? FORM_ERROR_KEY : issue.path;
    if (!(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}

/** Komunikat błędu dla użytkownika; `ApiError.message` niesie `detail` z problem+json. */
export function errorMessage(error: unknown, fallback = "Operacja nie powiodła się."): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

/** Znajduje listę błędów pól w błędzie albo w łańcuchu jego `cause`. */
function fieldIssuesOf(error: unknown, depth: number): { path: string; message: string }[] {
  if (depth > MAX_CAUSE_DEPTH || typeof error !== "object" || error === null) {
    return [];
  }
  const { errors, cause } = error as { errors?: unknown; cause?: unknown };
  if (Array.isArray(errors)) {
    // Wymagamy `path` typu string, żeby nie wciągnąć tu `AggregateError.errors` (lista wyjątków,
    // nie lista pól) ani innego rozszerzenia o przypadkowo zbieżnej nazwie.
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
