import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import type {
  CreateProjectBody,
  InviteMembersBody,
  Project,
  ProjectList,
  ProjectListQuery,
  UpdateProjectBody,
} from "./types.js";
import { unwrap } from "./unwrap.js";

/** Klucze cache — stabilne, hierarchiczne (invalidacja `all` czyści listy i detale). */
export const projectKeys = {
  all: ["projects"] as const,
  list: (query?: ProjectListQuery) => ["projects", "list", query ?? {}] as const,
  detail: (id: string) => ["projects", "detail", id] as const,
};

// Query-option factories — logika pobierania testowalna bez React (mock transport).

export function projectListQuery(client: ApiClient, query?: ProjectListQuery) {
  return {
    queryKey: projectKeys.list(query),
    queryFn: async (): Promise<ProjectList> =>
      unwrap(await client.GET("/api/v1/projects/", { params: { query } })),
  };
}

export function projectDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: projectKeys.detail(id),
    queryFn: async (): Promise<Project> =>
      unwrap(await client.GET("/api/v1/projects/{id}", { params: { path: { id } } })),
  };
}

export function useProjects(query?: ProjectListQuery) {
  return useQuery(projectListQuery(useApiClient(), query));
}

export function useProject(id: string) {
  return useQuery({ ...projectDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateProject() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateProjectBody): Promise<Project> =>
      unwrap(await client.POST("/api/v1/projects/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateProjectBody }): Promise<Project> =>
      unwrap(
        await client.PATCH("/api/v1/projects/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteProject() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/projects/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

/** Zaproszenia członków → mailer (bez zapisu). Osobny handler — używany w wizardzie. */
export function useInviteProjectMembers() {
  const client = useApiClient();
  return useMutation({
    mutationFn: async (vars: { id: string; emails: InviteMembersBody["emails"] }) =>
      unwrap(
        await client.POST("/api/v1/projects/{id}/invitations", {
          params: { path: { id: vars.id } },
          body: { emails: vars.emails },
        }),
      ),
  });
}
