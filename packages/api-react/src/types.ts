import type { paths } from "@repo/api-client";

// Typy wywiedzione z OpenAPI (jedno źródło prawdy) — req/res encji referencyjnych.

export type ProjectListQuery = NonNullable<
  paths["/api/v1/projects/"]["get"]["parameters"]["query"]
>;
export type ProjectList =
  paths["/api/v1/projects/"]["get"]["responses"][200]["content"]["application/json"];
export type Project =
  paths["/api/v1/projects/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateProjectBody =
  paths["/api/v1/projects/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateProjectBody =
  paths["/api/v1/projects/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export type TaskListQuery = NonNullable<paths["/api/v1/tasks/"]["get"]["parameters"]["query"]>;
export type TaskList =
  paths["/api/v1/tasks/"]["get"]["responses"][200]["content"]["application/json"];
export type Task =
  paths["/api/v1/tasks/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type CreateTaskBody =
  paths["/api/v1/tasks/"]["post"]["requestBody"]["content"]["application/json"];
export type UpdateTaskBody =
  paths["/api/v1/tasks/{id}"]["patch"]["requestBody"]["content"]["application/json"];
