import {
  type AnyRoute,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { CreateEventWizard } from "./entities/event-wizard";
import { CreateProjectWizard } from "./entities/project-wizard";
import { entityRegistry } from "./entities/registry";
import { Dashboard, LoginPage, ProtectedShell } from "./shell";

// Routing CODE-BASED sterowany rejestrem encji (kotwica scaffoldera). Typowanie tras trzymamy
// luźne (bez `Register`) — ścieżki pochodzą z runtime'owej tablicy, więc literałowe typy Linków
// tylko by przeszkadzały. Bezpieczeństwo kontraktu daje warstwa api-client (typy z OpenAPI).

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

// Pathless layout: wszystko poniżej wymaga sesji (ProtectedShell = auth-gate + AdminLayout).
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedShell,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: Dashboard,
});

const entityRoutes: AnyRoute[] = entityRegistry.flatMap((entity) => {
  const routes: AnyRoute[] = [
    createRoute({
      getParentRoute: () => protectedRoute,
      path: entity.path,
      component: entity.List,
    }),
    createRoute({
      getParentRoute: () => protectedRoute,
      path: `${entity.path}/$id`,
      component: entity.Detail,
    }),
  ];
  // Statyczne (`/new`) i bardziej szczegółowe (`/$id/edit`) mają pierwszeństwo nad `/$id`.
  if (entity.Create) {
    routes.push(
      createRoute({
        getParentRoute: () => protectedRoute,
        path: `${entity.path}/new`,
        component: entity.Create,
      }),
    );
  }
  if (entity.Edit) {
    routes.push(
      createRoute({
        getParentRoute: () => protectedRoute,
        path: `${entity.path}/$id/edit`,
        component: entity.Edit,
      }),
    );
  }
  return routes;
});

// Wizard referencyjny (poza rejestrem — pojedynczy przypadek). Statyczny → wygrywa z `/projects/$id`.
const eventWizardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/events/wizard",
  component: CreateEventWizard,
});

const wizardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/projects/wizard",
  component: CreateProjectWizard,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    wizardRoute,
    eventWizardRoute,
    ...entityRoutes,
  ] as AnyRoute[]),
]);

export const router = createRouter({ routeTree });
