import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./generated/schema.js";

/** The type-safe API client (GET/POST/PATCH/DELETE typed by the OpenAPI paths). */
export type ApiClient = Client<paths>;

export interface ApiClientOptions {
  /** The API base URL (for example "http://localhost:3000"). Injected EXPLICITLY by the shell. */
  baseUrl: string;
  /** Overrides the fetch implementation (tests, SSR). Defaults to the global `fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Default headers for every request. */
  headers?: Record<string, string>;
}

/**
 * Creates a client from one source of truth (OpenAPI → types). Framework-agnostic (`fetch`), with no
 * `import.meta.env` — the shell provides `baseUrl` at initialisation. Authentication goes through
 * cookies (access/refresh), hence `credentials: "include"`, consistent with CORS for two origins.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    headers: options.headers,
    credentials: "include",
  });
}
