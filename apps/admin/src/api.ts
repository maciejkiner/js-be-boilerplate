import { createApiClient } from "@repo/api-client";
import { QueryClient } from "@tanstack/react-query";

// Env czyta SKORUPA (nie pakiety) i wstrzykuje baseUrl do klienta.
const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const apiClient = createApiClient({ baseUrl });

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
