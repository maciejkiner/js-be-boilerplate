import type { ApiClient } from "@repo/api-client";
import { createContext, useContext, type ReactNode } from "react";

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiProviderProps {
  /** The client created by the shell with an EXPLICIT baseUrl (createApiClient). */
  client: ApiClient;
  children: ReactNode;
}

/**
 * Injects the API client into the React tree. The shell supplies the environment and base URL at
 * the package never reaches for `import.meta.env`. Mount it INSIDE `QueryClientProvider`.
 */
export function ApiProvider({ client, children }: ApiProviderProps) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === null) {
    throw new Error(
      "useApiClient: missing <ApiProvider>. Wrap the tree in <ApiProvider client={…}>.",
    );
  }
  return client;
}
