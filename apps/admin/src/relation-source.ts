import { useApiClient } from "@repo/api-react";
import type { RelationSource } from "@repo/forms-ui";

/**
 * The API convention: a singular entity → a plural, kebab-case path (`user` is a core entity →
 * `users`; `talkSpeaker` → `talk-speakers`).
 */
const pluralize = (entity: string) =>
  (entity === "user" ? "users" : `${entity}s`).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * The GENERIC source for relation fields: one fetcher for ANY target entity (no per-entity
 * branches). It hits `GET /api/v1/<plural>` and returns raw rows — `forms-ui` computes the label
 * from `relation.displayField` (so the same target entity can be shown through different fields). A
 * new entity works as a target with no registration at all. `q` is dropped by endpoints that do not
 * declare it (Zod strips it).
 */
export function useRelationSource(): RelationSource {
  const client = useApiClient();
  return async (relation, query) => {
    // A dynamic path — the cast to a known path is only for the openapi-fetch types; at runtime the real one is used.
    const res = await client.GET(`/api/v1/${pluralize(relation.entity)}/` as "/api/v1/users/", {
      params: { query: { pageSize: 50, q: query || undefined } },
    });
    return (res.data?.items ?? []) as Array<{ id: string } & Record<string, unknown>>;
  };
}
