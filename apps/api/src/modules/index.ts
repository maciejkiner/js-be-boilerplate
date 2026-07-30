import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Env } from "../config/env.js";
import type { Db } from "../db/client.js";
import type { Mailer } from "../lib/mailer/index.js";
import { projectsRoutes } from "./projects/projects.routes.js";
import { tasksRoutes } from "./tasks/tasks.routes.js";
import { usersRoutes } from "./users/users.routes.js";
import { commentsRoutes } from "./comments/comments.routes.js";
import { venuesRoutes } from "./venues/venues.routes.js";
import { speakersRoutes } from "./speakers/speakers.routes.js";
import { roomsRoutes } from "./rooms/rooms.routes.js";
import { eventsRoutes } from "./events/events.routes.js";
import { talksRoutes } from "./talks/talks.routes.js";
import { registrationsRoutes } from "./registrations/registrations.routes.js";
import { talkSpeakersRoutes } from "./talk-speakers/talk-speakers.routes.js";
// scaffolder:entities-import — do not remove

/**
 * Rejestr modułów domenowych montowanych pod `/api/v1`.
 *
 * Scaffolder dopisuje rejestracje przy kotwicy poniżej — konwencja + kotwica
 * zamiast parsowania AST (spec sekcja 6).
 *
 * Wzorzec dodania modułu:
 *   await app.register(productsRoutes({ db }), { prefix: "/products" });
 */
export function apiV1Routes(deps: { db: Db; mailer: Mailer; env: Env }): FastifyPluginAsyncZod {
  return async (app) => {
    await app.register(projectsRoutes({ db: deps.db, mailer: deps.mailer }), {
      prefix: "/projects",
    });
    await app.register(tasksRoutes({ db: deps.db }), { prefix: "/tasks" });
    await app.register(usersRoutes({ db: deps.db, env: deps.env, mailer: deps.mailer }), {
      prefix: "/users",
    });
    await app.register(commentsRoutes({ db: deps.db }), { prefix: "/comments" });
    await app.register(venuesRoutes({ db: deps.db }), { prefix: "/venues" });
    await app.register(speakersRoutes({ db: deps.db }), { prefix: "/speakers" });
    await app.register(roomsRoutes({ db: deps.db }), { prefix: "/rooms" });
    await app.register(eventsRoutes({ db: deps.db }), { prefix: "/events" });
    await app.register(talksRoutes({ db: deps.db }), { prefix: "/talks" });
    await app.register(registrationsRoutes({ db: deps.db }), { prefix: "/registrations" });
    await app.register(talkSpeakersRoutes({ db: deps.db }), { prefix: "/talk-speakers" });
    // scaffolder:entities-register — do not remove
  };
}
