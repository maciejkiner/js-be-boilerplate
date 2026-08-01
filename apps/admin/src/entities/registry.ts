import type { FunctionComponent } from "react";
import { ProjectCreate, ProjectDetail, ProjectEdit, ProjectsList } from "./projects";
import { TaskCreate, TaskDetail, TaskEdit, TasksList } from "./tasks";
import { UserDetail, UserInvite, UsersList } from "./users";
import { CommentsList, CommentDetail, CommentCreate, CommentEdit } from "./comments";
import { VenuesList, VenueDetail, VenueCreate, VenueEdit } from "./venues";
import { SpeakersList, SpeakerDetail, SpeakerCreate, SpeakerEdit } from "./speakers";
import { RoomsList, RoomDetail, RoomCreate, RoomEdit } from "./rooms";
import { EventsList, EventDetail, EventCreate, EventEdit } from "./events";
import { TalksList, TalkDetail, TalkCreate, TalkEdit } from "./talks";
import {
  RegistrationsList,
  RegistrationDetail,
  RegistrationCreate,
  RegistrationEdit,
} from "./registrations";
import {
  TalkSpeakersList,
  TalkSpeakerDetail,
  TalkSpeakerCreate,
  TalkSpeakerEdit,
} from "./talk-speakers";
// scaffolder:admin-import — do not remove

export interface EntityRoute {
  name: string;
  /** Etykieta w menu. */
  label: string;
  /** Ścieżka bazowa listy (detal = `${path}/$id`, create = `${path}/new`, edit = `${path}/$id/edit`). */
  path: string;
  // Function components — compatible with TanStack Router's `RouteComponent` (no classes).
  List: FunctionComponent;
  Detail: FunctionComponent;
  Create?: FunctionComponent;
  Edit?: FunctionComponent;
}

/**
 * The admin entity registry — ONE source for the menu and the routes. The scaffolder appends a
 * single entry at the anchor below; the menu (`Nav`) and the route tree (`routes.ts`) are built from
 * this array.
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
    // A CORE entity (auth), not scaffolded: user management (roles, deactivation) on the detail page,
    // `Create` is the invitation. There is no `Edit` (roles are edited in Detail). Admin-only endpoints.
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
  {
    name: "venue",
    label: "Venues",
    path: "/venues",
    List: VenuesList,
    Detail: VenueDetail,
    Create: VenueCreate,
    Edit: VenueEdit,
  },
  {
    name: "speaker",
    label: "Speakers",
    path: "/speakers",
    List: SpeakersList,
    Detail: SpeakerDetail,
    Create: SpeakerCreate,
    Edit: SpeakerEdit,
  },
  {
    name: "room",
    label: "Rooms",
    path: "/rooms",
    List: RoomsList,
    Detail: RoomDetail,
    Create: RoomCreate,
    Edit: RoomEdit,
  },
  {
    name: "event",
    label: "Events",
    path: "/events",
    List: EventsList,
    Detail: EventDetail,
    Create: EventCreate,
    Edit: EventEdit,
  },
  {
    name: "talk",
    label: "Talks",
    path: "/talks",
    List: TalksList,
    Detail: TalkDetail,
    Create: TalkCreate,
    Edit: TalkEdit,
  },
  {
    name: "registration",
    label: "Registrations",
    path: "/registrations",
    List: RegistrationsList,
    Detail: RegistrationDetail,
    Create: RegistrationCreate,
    Edit: RegistrationEdit,
  },
  {
    name: "talkSpeaker",
    label: "Talk speakers",
    path: "/talk-speakers",
    List: TalkSpeakersList,
    Detail: TalkSpeakerDetail,
    Create: TalkSpeakerCreate,
    Edit: TalkSpeakerEdit,
  },
  // scaffolder:admin-entities — do not remove
];
