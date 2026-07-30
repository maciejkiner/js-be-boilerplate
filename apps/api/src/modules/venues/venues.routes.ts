import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Db } from "../../db/client.js";
import { MessageSchema } from "../auth/auth.dto.js";
import {
  CreateVenueSchema,
  IdParamSchema,
  VenueListQuerySchema,
  VenueListResponseSchema,
  VenueResponseSchema,
  UpdateVenueSchema,
} from "./venues.dto.js";
import { venuesService } from "./venues.service.js";

/** CRUD venues pod /api/v1/venues. Wygenerowane: trasy → service → repository; auth wymagany. */
export function venuesRoutes(deps: { db: Db }): FastifyPluginAsyncZod {
  return async (app) => {
    const { db } = deps;

    app.get(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["venues"],
          querystring: VenueListQuerySchema,
          response: { 200: VenueListResponseSchema },
        },
      },
      async (request) => venuesService.list(db, request.query),
    );

    app.get(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["venues"], params: IdParamSchema, response: { 200: VenueResponseSchema } },
      },
      async (request) => venuesService.getById(db, request.params.id),
    );

    app.post(
      "/",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["venues"],
          body: CreateVenueSchema,
          response: { 201: VenueResponseSchema },
        },
      },
      async (request, reply) => {
        const row = await venuesService.create(db, request.body, request.user.sub);
        return reply.status(201).send(row);
      },
    );

    app.patch(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: {
          tags: ["venues"],
          params: IdParamSchema,
          body: UpdateVenueSchema,
          response: { 200: VenueResponseSchema },
        },
      },
      async (request) => venuesService.update(db, request.params.id, request.body),
    );

    app.delete(
      "/:id",
      {
        preHandler: [app.authenticate],
        schema: { tags: ["venues"], params: IdParamSchema, response: { 200: MessageSchema } },
      },
      async (request) => {
        await venuesService.remove(db, request.params.id);
        return { message: "Venue usunięty." };
      },
    );
  };
}
