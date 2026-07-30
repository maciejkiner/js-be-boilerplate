export { ApiProvider, useApiClient, type ApiProviderProps } from "./context.js";
export {
  projectKeys,
  projectListQuery,
  projectDetailQuery,
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useInviteProjectMembers,
} from "./projects.js";
export {
  userKeys,
  userListQuery,
  userDetailQuery,
  useUsers,
  useUser,
  useInviteUser,
  useUpdateUserRoles,
  useDeactivateUser,
  useReactivateUser,
  useSendPasswordReset,
} from "./users.js";
export {
  taskKeys,
  taskListQuery,
  taskDetailQuery,
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "./tasks.js";
export type {
  Project,
  ProjectList,
  ProjectListQuery,
  CreateProjectBody,
  UpdateProjectBody,
  Task,
  TaskList,
  TaskListQuery,
  CreateTaskBody,
  UpdateTaskBody,
  UserList,
  UserListQuery,
  User,
  InviteUserBody,
  UpdateUserRolesBody,
  InviteMembersBody,
} from "./types.js";

// Encje generowane przez scaffolder — jeden `export *` na encję (hooki + typy w pliku encji).
export * from "./comments.js";
export * from "./venues.js";
export * from "./speakers.js";
export * from "./rooms.js";
export * from "./events.js";
export * from "./talks.js";
export * from "./registrations.js";
export * from "./talk-speakers.js";
// scaffolder:hooks-export — do not remove
