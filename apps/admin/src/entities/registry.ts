import type { FunctionComponent } from "react";
import { ProjectDetail, ProjectsList } from "./projects";
import { TaskDetail, TasksList } from "./tasks";

export interface EntityRoute {
  name: string;
  /** Etykieta w menu. */
  label: string;
  /** Ścieżka bazowa listy (detal = `${path}/$id`). */
  path: string;
  // Funkcyjne komponenty — zgodne z `RouteComponent` TanStack Routera (bez klas).
  List: FunctionComponent;
  Detail: FunctionComponent;
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
  },
  { name: "task", label: "Zadania", path: "/tasks", List: TasksList, Detail: TaskDetail },
  // scaffolder:admin-entities — do not remove
];
