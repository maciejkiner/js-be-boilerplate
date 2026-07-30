import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateRegistrationSchema,
  IdParamSchema,
  RegistrationListQuerySchema,
  RegistrationListResponseSchema,
  RegistrationResponseSchema,
  UpdateRegistrationSchema,
} from "./registrations.dto.js";
import { registrationsService } from "./registrations.service.js";

/** CRUD registrations pod /api/v1/registrations. Wygenerowane: trasy → service → repository; auth wymagany. */
export function registrationsRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["registrations"],
          querystring: RegistrationListQuerySchema,
          response: { 200: RegistrationListResponseSchema },
        },
      },
      async (request) => registrationsService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["registrations"],
          params: IdParamSchema,
          response: { 200: RegistrationResponseSchema },
        },
      },
      async (request) => registrationsService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["registrations"],
          body: CreateRegistrationSchema,
          response: { 201: RegistrationResponseSchema },
        },
      },
      async (request, reply) => {
        const row = await registrationsService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["registrations"],
          params: IdParamSchema,
          body: UpdateRegistrationSchema,
          response: { 200: RegistrationResponseSchema },
        },
      },
      async (request) => registrationsService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["registrations"],
          params: IdParamSchema,
          response: { 200: MessageSchema },
        },
      },
      async (request) => {
        await registrationsService.remove(db, request.params.id);
        return { message: "Registration usunięty." };
      },
    );
  };
}
