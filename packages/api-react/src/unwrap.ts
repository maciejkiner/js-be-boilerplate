import { ApiError } from "@repo/api-client";

/**
 * Rozpakowuje wynik openapi-fetch (`{ data, error }`): zwraca dane albo RZUCA `ApiError`,
 * so that React Query treats it as an `error`. We never swallow errors silently.
 *
 * We throw a **real `Error`**, not the raw problem+json body — otherwise `error instanceof Error`
 * is false and `error.message` is empty, leaving the views with nothing to show the user.
 */
export function unwrap<T>(result: { data?: T; error?: unknown }): T {
  if (result.error !== undefined && result.error !== null) {
    throw new ApiError(result.error);
  }
  return result.data as T;
}
