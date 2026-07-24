/**
 * Rozpakowuje wynik openapi-fetch (`{ data, error }`): zwraca dane albo RZUCA błąd
 * (ciało problem+json), by React Query potraktował go jako `error`. Nie połykamy błędów po cichu.
 */
export function unwrap<T>(result: { data?: T; error?: unknown }): T {
  if (result.error !== undefined && result.error !== null) {
    throw result.error;
  }
  return result.data as T;
}
