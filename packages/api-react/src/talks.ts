import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type TalkListQuery = NonNullable<paths["/api/v1/talks/"]["get"]["parameters"]["query"]>;
export type TalkList =
  paths["/api/v1/talks/"]["get"]["responses"][200]["content"]["application/json"];
export type Talk =
  paths["/api/v1/talks/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateTalkBody =
  paths["/api/v1/talks/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateTalkBody =
  paths["/api/v1/talks/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const talksKeys = {
  all: ["talks"] as const,
  list: (query?: TalkListQuery) => ["talks", "list", query ?? {}] as const,
  detail: (id: string) => ["talks", "detail", id] as const,
};

export function talksListQuery(client: ApiClient, query?: TalkListQuery) {
  return {
    queryKey: talksKeys.list(query),
    queryFn: async (): Promise<TalkList> =>
      unwrap(await client.GET("/api/v1/talks/", { params: { query } })),
  };
}

export function talksDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: talksKeys.detail(id),
    queryFn: async (): Promise<Talk> =>
      unwrap(await client.GET("/api/v1/talks/{id}", { params: { path: { id } } })),
  };
}

export function useTalks(query?: TalkListQuery) {
  return useQuery(talksListQuery(useApiClient(), query));
}

export function useTalk(id: string) {
  return useQuery({ ...talksDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateTalk() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTalkBody): Promise<Talk> =>
      unwrap(await client.POST("/api/v1/talks/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: talksKeys.all }),
  });
}

export function useUpdateTalk() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateTalkBody }): Promise<Talk> =>
      unwrap(
        await client.PATCH("/api/v1/talks/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: talksKeys.all }),
        queryClient.invalidateQueries({ queryKey: talksKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteTalk() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/talks/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: talksKeys.all }),
  });
}
