import type { ApiClient } from "@repo/api-client";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import type { UserList, UserListQuery } from "./types.js";
import { unwrap } from "./unwrap.js";

export const userKeys = {
  all: ["users"] as const,
  list: (query?: UserListQuery) => ["users", "list", query ?? {}] as const,
};

/** Query-option factory listy userów (pola relacji `assignee`). */
export function userListQuery(client: ApiClient, query?: UserListQuery) {
  return {
    queryKey: userKeys.list(query),
    queryFn: async (): Promise<UserList> =>
      unwrap(await client.GET("/api/v1/users/", { params: { query } })),
  };
}

export function useUsers(query?: UserListQuery) {
  return useQuery(userListQuery(useApiClient(), query));
}
