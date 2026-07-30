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
