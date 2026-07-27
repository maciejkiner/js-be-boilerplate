import type { FunctionComponent } from "react";
import { ProjectCreate, ProjectDetail, ProjectEdit, ProjectsList } from "./projects";
import { TaskCreate, TaskDetail, TaskEdit, TasksList } from "./tasks";

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
  // scaffolder:admin-entities — do not remove
];
