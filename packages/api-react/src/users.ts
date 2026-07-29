import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import type {
  InviteUserBody,
  UpdateUserRolesBody,
  User,
  UserList,
  UserListQuery,
} from "./types.js";
import { unwrap } from "./unwrap.js";

export const userKeys = {
  all: ["users"] as const,
  list: (query?: UserListQuery) => ["users", "list", query ?? {}] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};

/** Query-option factory listy userów (pola relacji `assignee` + lista w panelu admina). */
export function userListQuery(client: ApiClient, query?: UserListQuery) {
  return {
    queryKey: userKeys.list(query),
    queryFn: async (): Promise<UserList> =>
      unwrap(await client.GET("/api/v1/users/", { params: { query } })),
  };
}

export function userDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: userKeys.detail(id),
    queryFn: async (): Promise<User> =>
      unwrap(await client.GET("/api/v1/users/{id}", { params: { path: { id } } })),
  };
}

export function useUsers(query?: UserListQuery) {
  return useQuery(userListQuery(useApiClient(), query));
}

export function useUser(id: string) {
  return useQuery({ ...userDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useInviteUser() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: InviteUserBody): Promise<User> =>
      unwrap(await client.POST("/api/v1/users/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useUpdateUserRoles() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateUserRolesBody }): Promise<User> =>
      unwrap(
        await client.PATCH("/api/v1/users/{id}/roles", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeactivateUser() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<User> =>
      unwrap(await client.POST("/api/v1/users/{id}/deactivate", { params: { path: { id } } })),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ]),
  });
}

export function useReactivateUser() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<User> =>
      unwrap(await client.POST("/api/v1/users/{id}/reactivate", { params: { path: { id } } })),
    onSuccess: (_data, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: userKeys.all }),
        queryClient.invalidateQueries({ queryKey: userKeys.detail(id) }),
      ]),
  });
}

export function useSendPasswordReset() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.POST("/api/v1/users/{id}/password-reset", { params: { path: { id } } })),
  });
}
