import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateTaskSchema,
  IdParamSchema,
  TaskListQuerySchema,
  TaskListResponseSchema,
  TaskResponseSchema,
  UpdateTaskSchema,
} from "./tasks.dto.js";
import { tasksService } from "./tasks.service.js";

/** CRUD zadań pod /api/v1/tasks. Wzorzec: trasy → service → repository; auth wymagany. */
export function tasksRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["tasks"],
          querystring: TaskListQuerySchema,
          response: { 200: TaskListResponseSchema },
        },
      },
      async (request) => tasksService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["tasks"], params: IdParamSchema, response: { 200: TaskResponseSchema } },
      },
      async (request) => tasksService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["tasks"], body: CreateTaskSchema, response: { 201: TaskResponseSchema } },
      },
      async (request, reply) => {
        const task = await tasksService.create(db, request.body, request.user.sub);
        return reply.status(201).send(task);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["tasks"],
          params: IdParamSchema,
          body: UpdateTaskSchema,
          response: { 200: TaskResponseSchema },
        },
      },
      async (request) => tasksService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["tasks"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await tasksService.remove(db, request.params.id);
        return { message: "Zadanie usunięte." };
      },
    );
  };
}
