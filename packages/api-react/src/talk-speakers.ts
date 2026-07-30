import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type TalkSpeakerListQuery = NonNullable<
  paths["/api/v1/talk-speakers/"]["get"]["parameters"]["query"]
>;
export type TalkSpeakerList =
  paths["/api/v1/talk-speakers/"]["get"]["responses"][200]["content"]["application/json"];
export type TalkSpeaker =
  paths["/api/v1/talk-speakers/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateTalkSpeakerBody =
  paths["/api/v1/talk-speakers/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateTalkSpeakerBody =
  paths["/api/v1/talk-speakers/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const talkSpeakersKeys = {
  all: ["talkSpeakers"] as const,
  list: (query?: TalkSpeakerListQuery) => ["talkSpeakers", "list", query ?? {}] as const,
  detail: (id: string) => ["talkSpeakers", "detail", id] as const,
};

export function talkSpeakersListQuery(client: ApiClient, query?: TalkSpeakerListQuery) {
  return {
    queryKey: talkSpeakersKeys.list(query),
    queryFn: async (): Promise<TalkSpeakerList> =>
      unwrap(await client.GET("/api/v1/talk-speakers/", { params: { query } })),
  };
}

export function talkSpeakersDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: talkSpeakersKeys.detail(id),
    queryFn: async (): Promise<TalkSpeaker> =>
      unwrap(await client.GET("/api/v1/talk-speakers/{id}", { params: { path: { id } } })),
  };
}

export function useTalkSpeakers(query?: TalkSpeakerListQuery) {
  return useQuery(talkSpeakersListQuery(useApiClient(), query));
}

export function useTalkSpeaker(id: string) {
  return useQuery({ ...talkSpeakersDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateTalkSpeaker() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTalkSpeakerBody): Promise<TalkSpeaker> =>
      unwrap(await client.POST("/api/v1/talk-speakers/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: talkSpeakersKeys.all }),
  });
}

export function useUpdateTalkSpeaker() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateTalkSpeakerBody }): Promise<TalkSpeaker> =>
      unwrap(
        await client.PATCH("/api/v1/talk-speakers/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: talkSpeakersKeys.all }),
        queryClient.invalidateQueries({ queryKey: talkSpeakersKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteTalkSpeaker() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/talk-speakers/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: talkSpeakersKeys.all }),
  });
}
