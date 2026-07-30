import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type VenueListQuery = NonNullable<paths["/api/v1/venues/"]["get"]["parameters"]["query"]>;
export type VenueList =
  paths["/api/v1/venues/"]["get"]["responses"][200]["content"]["application/json"];
export type Venue =
  paths["/api/v1/venues/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateVenueBody =
  paths["/api/v1/venues/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateVenueBody =
  paths["/api/v1/venues/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const venuesKeys = {
  all: ["venues"] as const,
  list: (query?: VenueListQuery) => ["venues", "list", query ?? {}] as const,
  detail: (id: string) => ["venues", "detail", id] as const,
};

export function venuesListQuery(client: ApiClient, query?: VenueListQuery) {
  return {
    queryKey: venuesKeys.list(query),
    queryFn: async (): Promise<VenueList> =>
      unwrap(await client.GET("/api/v1/venues/", { params: { query } })),
  };
}

export function venuesDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: venuesKeys.detail(id),
    queryFn: async (): Promise<Venue> =>
      unwrap(await client.GET("/api/v1/venues/{id}", { params: { path: { id } } })),
  };
}

export function useVenues(query?: VenueListQuery) {
  return useQuery(venuesListQuery(useApiClient(), query));
}

export function useVenue(id: string) {
  return useQuery({ ...venuesDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateVenue() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateVenueBody): Promise<Venue> =>
      unwrap(await client.POST("/api/v1/venues/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: venuesKeys.all }),
  });
}

export function useUpdateVenue() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateVenueBody }): Promise<Venue> =>
      unwrap(
        await client.PATCH("/api/v1/venues/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: venuesKeys.all }),
        queryClient.invalidateQueries({ queryKey: venuesKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteVenue() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/venues/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: venuesKeys.all }),
  });
}
