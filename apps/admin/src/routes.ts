import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
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

const entityRoutes = entityRegistry.flatMap((entity) => [
  createRoute({ getParentRoute: () => protectedRoute, path: entity.path, component: entity.List }),
  createRoute({
    getParentRoute: () => protectedRoute,
    path: `${entity.path}/$id`,
    component: entity.Detail,
  }),
]);

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([indexRoute, ...entityRoutes]),
]);

export const router = createRouter({ routeTree });
