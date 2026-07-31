import { ApiError } from "@repo/api-client";

/**
 * Rozpakowuje wynik openapi-fetch (`{ data, error }`): zwraca dane albo RZUCA `ApiError`,
 * by React Query potraktował go jako `error`. Nie połykamy błędów po cichu.
 *
 * Rzucamy **prawdziwy `Error`**, nie surowe ciało problem+json — inaczej `error instanceof Error`
 * jest fałszem, a `error.message` puste, więc widoki nie mają czego pokazać użytkownikowi.
 */
export function unwrap<T>(result: { data?: T; error?: unknown }): T {
  if (result.error !== undefined && result.error !== null) {
    throw new ApiError(result.error);
  }
  return result.data as T;
}
