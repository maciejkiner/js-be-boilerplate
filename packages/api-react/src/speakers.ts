import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type SpeakerListQuery = NonNullable<
  paths["/api/v1/speakers/"]["get"]["parameters"]["query"]
>;
export type SpeakerList =
  paths["/api/v1/speakers/"]["get"]["responses"][200]["content"]["application/json"];
export type Speaker =
  paths["/api/v1/speakers/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateSpeakerBody =
  paths["/api/v1/speakers/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateSpeakerBody =
  paths["/api/v1/speakers/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const speakersKeys = {
  all: ["speakers"] as const,
  list: (query?: SpeakerListQuery) => ["speakers", "list", query ?? {}] as const,
  detail: (id: string) => ["speakers", "detail", id] as const,
};

export function speakersListQuery(client: ApiClient, query?: SpeakerListQuery) {
  return {
    queryKey: speakersKeys.list(query),
    queryFn: async (): Promise<SpeakerList> =>
      unwrap(await client.GET("/api/v1/speakers/", { params: { query } })),
  };
}

export function speakersDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: speakersKeys.detail(id),
    queryFn: async (): Promise<Speaker> =>
      unwrap(await client.GET("/api/v1/speakers/{id}", { params: { path: { id } } })),
  };
}

export function useSpeakers(query?: SpeakerListQuery) {
  return useQuery(speakersListQuery(useApiClient(), query));
}

export function useSpeaker(id: string) {
  return useQuery({ ...speakersDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateSpeaker() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateSpeakerBody): Promise<Speaker> =>
      unwrap(await client.POST("/api/v1/speakers/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: speakersKeys.all }),
  });
}

export function useUpdateSpeaker() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateSpeakerBody }): Promise<Speaker> =>
      unwrap(
        await client.PATCH("/api/v1/speakers/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: speakersKeys.all }),
        queryClient.invalidateQueries({ queryKey: speakersKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteSpeaker() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/speakers/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: speakersKeys.all }),
  });
}
