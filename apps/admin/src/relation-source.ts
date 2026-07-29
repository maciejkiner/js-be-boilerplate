import { useApiClient } from "@repo/api-react";
import type { RelationSource } from "@repo/forms-ui";

/** Konwencja API: encja pojedyncza → ścieżka w liczbie mnogiej (`user` to encja core → `users`). */
const pluralize = (entity: string) => (entity === "user" ? "users" : `${entity}s`);

/**
 * GENERYCZNE źródło pól relacji: jeden fetcher dla DOWOLNEJ encji-celu (bez per-encja gałęzi).
 * Uderza w `GET /api/v1/<plural>` i zwraca surowe wiersze — label liczy `forms-ui` z
 * `relation.displayField` (ta sama encja-cel może być pokazywana różnymi polami). Nowa encja działa
 * jako cel bez żadnej rejestracji. `q` jest pomijane przez endpointy bez tego pola (zod strip).
 */
export function useRelationSource(): RelationSource {
  const client = useApiClient();
  return async (relation, query) => {
    // Ścieżka dynamiczna — rzut na znaną ścieżkę tylko dla typów openapi-fetch; runtime używa realnej.
    const res = await client.GET(`/api/v1/${pluralize(relation.entity)}/` as "/api/v1/users/", {
      params: { query: { pageSize: 50, q: query || undefined } },
    });
    return (res.data?.items ?? []) as Array<{ id: string } & Record<string, unknown>>;
  };
}
