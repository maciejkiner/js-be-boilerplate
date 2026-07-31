import { ConflictError, type ProblemFieldError } from "../lib/http/problem.js";

/** Kod błędu Postgresa dla naruszenia ograniczenia unikalności. */
const UNIQUE_VIOLATION = "23505";

/**
 * Zwraca nazwę naruszonego ograniczenia unikalności albo `undefined`, gdy błąd jest innego rodzaju.
 * Nazwy indeksów unikalnych generuje scaffolder deterministycznie, więc moduł potrafi po nich
 * rozpoznać, KTÓRE pola się powtórzyły, i zwrócić 409 z konkretnym komunikatem.
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
 * Konflikt unikalności → 409 z rozszerzeniem `errors`, czyli listą PÓL, które się powtórzyły.
 *
 * `detail` czyta człowiek, `errors` czyta formularz: bez tej listy klient zna nazwę pola wyłącznie
 * ze zdania w `detail` i nie ma jak podświetlić kontrolki, którą trzeba poprawić.
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
