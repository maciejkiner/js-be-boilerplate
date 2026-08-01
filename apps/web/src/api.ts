import { createApiClient } from "@repo/api-client";
import { QueryClient } from "@tanstack/react-query";

// The SHELL reads the env and injects baseUrl into the client (packages never touch import.meta.env).
const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const apiClient = createApiClient({ baseUrl });
export const queryClient = new QueryClient();
