import type { FunctionComponent } from "react";
import { ProjectCreate, ProjectDetail, ProjectEdit, ProjectsList } from "./projects";
import { TaskCreate, TaskDetail, TaskEdit, TasksList } from "./tasks";
import { UserDetail, UserInvite, UsersList } from "./users";
import { CommentsList, CommentDetail, CommentCreate, CommentEdit } from "./comments";
// scaffolder:admin-import — do not remove

export interface EntityRoute {
  name: string;
  /** Etykieta w menu. */
  label: string;
  /** Ścieżka bazowa listy (detal = `${path}/$id`, create = `${path}/new`, edit = `${path}/$id/edit`). */
  path: string;
  // Funkcyjne komponenty — zgodne z `RouteComponent` TanStack Routera (bez klas).
  List: FunctionComponent;
  Detail: FunctionComponent;
  Create?: FunctionComponent;
  Edit?: FunctionComponent;
}

/**
 * Rejestr encji admina — JEDNO źródło menu i tras. Scaffolder (Faza 8) dopisuje jedną pozycję
 * przy kotwicy poniżej; menu (`Nav`) i drzewo tras (`routes.ts`) budują się z tej tablicy.
 */
export const entityRegistry: EntityRoute[] = [
  {
    name: "project",
    label: "Projekty",
    path: "/projects",
    List: ProjectsList,
    Detail: ProjectDetail,
    Create: ProjectCreate,
    Edit: ProjectEdit,
  },
  {
    name: "task",
    label: "Zadania",
    path: "/tasks",
    List: TasksList,
    Detail: TaskDetail,
    Create: TaskCreate,
    Edit: TaskEdit,
  },
  {
    // Encja CORE (auth), nie scaffoldowana: zarządzanie userami (role/dezaktywacja) w widoku detalu,
    // `Create` = zaproszenie. Brak `Edit` (role edytowane w Detail). Endpointy tylko dla admina.
    name: "user",
    label: "Użytkownicy",
    path: "/users",
    List: UsersList,
    Detail: UserDetail,
    Create: UserInvite,
  },
  {
    name: "comment",
    label: "Comments",
    path: "/comments",
    List: CommentsList,
    Detail: CommentDetail,
    Create: CommentCreate,
    Edit: CommentEdit,
  },
  // scaffolder:admin-entities — do not remove
];
