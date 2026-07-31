export { ApiError } from "./api-error.js";
export { createApiClient } from "./client.js";
export type { ApiClient, ApiClientOptions } from "./client.js";
// Typy ścieżek z OpenAPI — konsumenci (api-react, skorupy) czerpią z nich req/res.
export type { paths } from "./generated/schema.js";
