import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type EventListQuery = NonNullable<paths["/api/v1/events/"]["get"]["parameters"]["query"]>;
export type EventList =
  paths["/api/v1/events/"]["get"]["responses"][200]["content"]["application/json"];
export type Event =
  paths["/api/v1/events/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateEventBody =
  paths["/api/v1/events/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateEventBody =
  paths["/api/v1/events/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const eventsKeys = {
  all: ["events"] as const,
  list: (query?: EventListQuery) => ["events", "list", query ?? {}] as const,
  detail: (id: string) => ["events", "detail", id] as const,
};

export function eventsListQuery(client: ApiClient, query?: EventListQuery) {
  return {
    queryKey: eventsKeys.list(query),
    queryFn: async (): Promise<EventList> =>
      unwrap(await client.GET("/api/v1/events/", { params: { query } })),
  };
}

export function eventsDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: eventsKeys.detail(id),
    queryFn: async (): Promise<Event> =>
      unwrap(await client.GET("/api/v1/events/{id}", { params: { path: { id } } })),
  };
}

export function useEvents(query?: EventListQuery) {
  return useQuery(eventsListQuery(useApiClient(), query));
}

export function useEvent(id: string) {
  return useQuery({ ...eventsDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateEvent() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateEventBody): Promise<Event> =>
      unwrap(await client.POST("/api/v1/events/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKeys.all }),
  });
}

export function useUpdateEvent() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateEventBody }): Promise<Event> =>
      unwrap(
        await client.PATCH("/api/v1/events/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: eventsKeys.all }),
        queryClient.invalidateQueries({ queryKey: eventsKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteEvent() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/events/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventsKeys.all }),
  });
}

type InviteSpeakersBody =
  paths["/api/v1/events/{id}/invitations"]["post"]["requestBody"]["content"]["application/json"];
type CreateEventTalksBody =
  paths["/api/v1/events/{id}/talks"]["post"]["requestBody"]["content"]["application/json"];

/** The agenda in bulk: one request for the whole batch, all-or-nothing. Used by the wizard. */
export function useCreateEventTalks() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; talks: CreateEventTalksBody["talks"] }) =>
      unwrap(
        await client.POST("/api/v1/events/{id}/talks", {
          params: { path: { id: vars.id } },
          body: { talks: vars.talks },
        }),
      ),
    // New talks invalidate the talk lists, not the event ones.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["talks"] }),
  });
}

/** Speaker invitations → the mailer (nothing persisted). A separate handler, used by the wizard. */
export function useInviteEventSpeakers() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async (vars: { id: string; emails: InviteSpeakersBody["emails"] }) =>
      unwrap(
        await client.POST("/api/v1/events/{id}/invitations", {
          params: { path: { id: vars.id } },
          body: { emails: vars.emails },
        }),
      ),
  });
}
