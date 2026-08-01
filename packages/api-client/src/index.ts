export { ApiError, errorMessage, type ApiFieldError } from "./api-error.js";
export { createApiClient } from "./client.js";
export type { ApiClient, ApiClientOptions } from "./client.js";
// The path types from OpenAPI — consumers (api-react, the shells) derive req/res from them.
export type { paths } from "./generated/schema.js";
