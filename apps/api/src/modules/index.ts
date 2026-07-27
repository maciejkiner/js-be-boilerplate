import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../db/client.js";
import type { Mailer } from "../lib/mailer/index.js";
import { projectsRoutes } from "./projects/projects.routes.js";
import { tasksRoutes } from "./tasks/tasks.routes.js";
import { usersRoutes } from "./users/users.routes.js";

/**
 * Rejestr modułów domenowych montowanych pod `/api/v1`.
 *
 * Scaffolder dopisuje rejestracje przy kotwicy poniżej — konwencja + kotwica
 * zamiast parsowania AST (spec sekcja 6).
 *
 * Wzorzec dodania modułu:
 *   await app.register(productsRoutes({ db }), { prefix: "/products" });
 */
export function apiV1Routes(deps: { db: Db; mailer: Mailer }): FastifyPluginAsyncZod {
  return async (app) => {
    await app.register(projectsRoutes({ db: deps.db, mailer: deps.mailer }), {
      prefix: "/projects",
    });
    await app.register(tasksRoutes({ db: deps.db }), { prefix: "/tasks" });
    await app.register(usersRoutes({ db: deps.db }), { prefix: "/users" });
    // scaffolder:entities-register — do not remove
  };
}
