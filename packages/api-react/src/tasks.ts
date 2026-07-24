import type { ApiClient } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import type { CreateTaskBody, Task, TaskList, TaskListQuery, UpdateTaskBody } from "./types.js";
import { unwrap } from "./unwrap.js";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (query?: TaskListQuery) => ["tasks", "list", query ?? {}] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
};

export function taskListQuery(client: ApiClient, query?: TaskListQuery) {
  return {
    queryKey: taskKeys.list(query),
    queryFn: async (): Promise<TaskList> =>
      unwrap(await client.GET("/api/v1/tasks/", { params: { query } })),
  };
}

export function taskDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: taskKeys.detail(id),
    queryFn: async (): Promise<Task> =>
      unwrap(await client.GET("/api/v1/tasks/{id}", { params: { path: { id } } })),
  };
}

export function useTasks(query?: TaskListQuery) {
  return useQuery(taskListQuery(useApiClient(), query));
}

export function useTask(id: string) {
  return useQuery({ ...taskDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateTask() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTaskBody): Promise<Task> =>
      unwrap(await client.POST("/api/v1/tasks/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateTaskBody }): Promise<Task> =>
      unwrap(
        await client.PATCH("/api/v1/tasks/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteTask() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/tasks/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
