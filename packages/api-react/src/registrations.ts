import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type RegistrationListQuery = NonNullable<
  paths["/api/v1/registrations/"]["get"]["parameters"]["query"]
>;
export type RegistrationList =
  paths["/api/v1/registrations/"]["get"]["responses"][200]["content"]["application/json"];
export type Registration =
  paths["/api/v1/registrations/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateRegistrationBody =
  paths["/api/v1/registrations/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateRegistrationBody =
  paths["/api/v1/registrations/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const registrationsKeys = {
  all: ["registrations"] as const,
  list: (query?: RegistrationListQuery) => ["registrations", "list", query ?? {}] as const,
  detail: (id: string) => ["registrations", "detail", id] as const,
};

export function registrationsListQuery(client: ApiClient, query?: RegistrationListQuery) {
  return {
    queryKey: registrationsKeys.list(query),
    queryFn: async (): Promise<RegistrationList> =>
      unwrap(await client.GET("/api/v1/registrations/", { params: { query } })),
  };
}

export function registrationsDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: registrationsKeys.detail(id),
    queryFn: async (): Promise<Registration> =>
      unwrap(await client.GET("/api/v1/registrations/{id}", { params: { path: { id } } })),
  };
}

export function useRegistrations(query?: RegistrationListQuery) {
  return useQuery(registrationsListQuery(useApiClient(), query));
}

export function useRegistration(id: string) {
  return useQuery({ ...registrationsDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateRegistration() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateRegistrationBody): Promise<Registration> =>
      unwrap(await client.POST("/api/v1/registrations/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: registrationsKeys.all }),
  });
}

export function useUpdateRegistration() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateRegistrationBody }): Promise<Registration> =>
      unwrap(
        await client.PATCH("/api/v1/registrations/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: registrationsKeys.all }),
        queryClient.invalidateQueries({ queryKey: registrationsKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteRegistration() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/registrations/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: registrationsKeys.all }),
  });
}
