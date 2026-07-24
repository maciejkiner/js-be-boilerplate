import type { ApiClient } from "@repo/api-client";
import { createContext, useContext, type ReactNode } from "react";

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiProviderProps {
  /** Klient utworzony przez skorupę z JAWNYM baseUrl (createApiClient). */
  client: ApiClient;
  children: ReactNode;
}

/**
 * Wstrzykuje klienta API w drzewo React. Env/baseURL podaje skorupa przy inicjalizacji —
 * pakiet nie sięga po `import.meta.env`. Osadź WEWNĄTRZ `QueryClientProvider` (TanStack Query).
 */
export function ApiProvider({ client, children }: ApiProviderProps) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (client === null) {
    throw new Error("useApiClient: brak <ApiProvider>. Osadź drzewo w <ApiProvider client={…}>.");
  }
  return client;
}
