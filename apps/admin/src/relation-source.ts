import { useProjects, useUsers } from "@repo/api-react";
import type { RelationSource } from "@repo/forms-ui";
import { useState } from "react";

/**
 * Buduje `RelationSource` dla pól relacji z danych API. Hooki wołane bezwarunkowo na górze
 * (rules-of-hooks); zwracana funkcja tylko mapuje. `project` → lista projektów (filtr lokalny w
 * comboboxie), `user` → lista userów z async-search po e-mailu (endpoint `?q=`).
 */
export function useRelationSource(): RelationSource {
  const [userQuery, setUserQuery] = useState("");
  const projects = useProjects({ pageSize: 50 });
  const users = useUsers({ pageSize: 20, q: userQuery || undefined });

  return (relation) => {
    if (relation.entity === "project") {
      return {
        options: (projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
      };
    }
    if (relation.entity === "user") {
      return {
        options: (users.data?.items ?? []).map((u) => ({ value: u.id, label: u.email })),
        onSearch: setUserQuery,
        loading: users.isFetching,
      };
    }
    return { options: [] };
  };
}
