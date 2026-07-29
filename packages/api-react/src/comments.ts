import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type CommentListQuery = NonNullable<
  paths["/api/v1/comments/"]["get"]["parameters"]["query"]
>;
export type CommentList =
  paths["/api/v1/comments/"]["get"]["responses"][200]["content"]["application/json"];
export type Comment =
  paths["/api/v1/comments/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateCommentBody =
  paths["/api/v1/comments/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateCommentBody =
  paths["/api/v1/comments/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const commentsKeys = {
  all: ["comments"] as const,
  list: (query?: CommentListQuery) => ["comments", "list", query ?? {}] as const,
  detail: (id: string) => ["comments", "detail", id] as const,
};

export function commentsListQuery(client: ApiClient, query?: CommentListQuery) {
  return {
    queryKey: commentsKeys.list(query),
    queryFn: async (): Promise<CommentList> =>
      unwrap(await client.GET("/api/v1/comments/", { params: { query } })),
  };
}

export function commentsDetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: commentsKeys.detail(id),
    queryFn: async (): Promise<Comment> =>
      unwrap(await client.GET("/api/v1/comments/{id}", { params: { path: { id } } })),
  };
}

export function useComments(query?: CommentListQuery) {
  return useQuery(commentsListQuery(useApiClient(), query));
}

export function useComment(id: string) {
  return useQuery({ ...commentsDetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreateComment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCommentBody): Promise<Comment> =>
      unwrap(await client.POST("/api/v1/comments/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsKeys.all }),
  });
}

export function useUpdateComment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateCommentBody }): Promise<Comment> =>
      unwrap(
        await client.PATCH("/api/v1/comments/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsKeys.all }),
        queryClient.invalidateQueries({ queryKey: commentsKeys.detail(vars.id) }),
      ]),
  });
}

export function useDeleteComment() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("/api/v1/comments/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentsKeys.all }),
  });
}
