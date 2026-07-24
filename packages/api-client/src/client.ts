import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./generated/schema.js";

/** Type-safe klient API (metody GET/POST/PATCH/DELETE typowane ścieżkami z OpenAPI). */
export type ApiClient = Client<paths>;

export interface ApiClientOptions {
  /** Bazowy URL API (np. "http://localhost:3000"). Wstrzykiwany JAWNIE przez skorupę. */
  baseUrl: string;
  /** Nadpisanie implementacji fetch (testy / SSR). Domyślnie globalny `fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Nagłówki domyślne dla każdego żądania. */
  headers?: Record<string, string>;
}

/**
 * Tworzy klienta z jednego źródła prawdy (OpenAPI → typy). Framework-agnostic (`fetch`),
 * bez `import.meta.env` — `baseUrl` podaje skorupa przy inicjalizacji. Uwierzytelnianie przez
 * cookies (access/refresh), więc `credentials: "include"` — spójnie z CORS na dwa originy.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    headers: options.headers,
    credentials: "include",
  });
}
