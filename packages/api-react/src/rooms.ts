import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type RoomListQuery = NonNullable<paths["/api/v1/rooms/"]["get"]["parameters"]["query"]>;
export type RoomList =
  paths["/api/v1/rooms/"]["get"]["responses"][200]["content"]["application/json"];
export type Room =
  paths["/api/v1/rooms/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateRoomBody =
  paths["/api/v1/rooms/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateRoomBody =
  paths["/api/v1/rooms/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const roomsKeys = {
  all: ["rooms"] as const,
  list: (query?: RoomListQuery) => ["rooms", "list", query ?? {}] as const,
  detail: (id: string) => ["rooms", "detail", id] as const,
};

export function roomsListQuery(client: ApiClient, query?: RoomListQuery) {
  return {
    queryKey: roomsKeys.list(query),
    queryFn: async (): Promise<RoomList> =>
      unwrap(await client.GET("/api/v1/rooms/", { params: { query } })),
  };
}

export function roomsDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: roomsKeys.detail(id),
    queryFn: async (): Promise<Room> =>
      unwrap(await client.GET("/api/v1/rooms/{id}", { params: { path: { id } } })),
  };
}

export function useRooms(query?: RoomListQuery) {
  return useQuery(roomsListQuery(useApiClient(), query));
}

export function useRoom(id: string) {
  return useQuery({ ...roomsDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateRoom() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRoomBody): Promise<Room> =>
      unwrap(await client.POST("/api/v1/rooms/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsKeys.all }),
  });
}

export function useUpdateRoom() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateRoomBody }): Promise<Room> =>
      unwrap(
        await client.PATCH("/api/v1/rooms/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsKeys.all }),
        queryClient.invalidateQueries({ queryKey: roomsKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteRoom() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/rooms/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsKeys.all }),
  });
}
