import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../db/client.js";
import { projectsRoutes } from "./projects/projects.routes.js";
import { tasksRoutes } from "./tasks/tasks.routes.js";

/**
 * Rejestr modułów domenowych montowanych pod `/api/v1`.
 *
 * Scaffolder dopisuje rejestracje przy kotwicy poniżej — konwencja + kotwica
 * zamiast parsowania AST (spec sekcja 6).
 *
 * Wzorzec dodania modułu:
 *   await app.register(productsRoutes({ db }), { prefix: "/products" });
 */
export function apiV1Routes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    await app.register(projectsRoutes({ db: deps.db }), { prefix: "/projects" });
    await app.register(tasksRoutes({ db: deps.db }), { prefix: "/tasks" });
    // scaffolder:entities-register — do not remove
  };
}
