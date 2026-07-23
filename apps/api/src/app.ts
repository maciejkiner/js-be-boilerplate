import { randomUUID } from "node:crypto";
import fastifySwagger from "@fastify/swagger";
import Fastify, { type FastifyInstance } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { Env } from "./config/env.js";
import type { ErrorTracker } from "./lib/error-tracking/index.js";
import { createErrorHandler, notFoundHandler } from "./lib/http/error-handler.js";
import { buildLoggerOptions } from "./lib/logger.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { apiV1Routes } from "./modules/index.js";

export interface BuildAppOptions {
  env: Env;
  errorTracker: ErrorTracker;
}

/**
 * Składa instancję Fastify z konwencjami bootstrapu: walidacja/serializacja przez
 * Zod, structured logi, OpenAPI generowany ze schematów, globalny handler błędów,
 * moduły domenowe montowane z rejestru pod `/api/v1`. Nie startuje nasłuchu.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { env, errorTracker } = options;

  const app = Fastify({
    logger: buildLoggerOptions(env),
    // reqId = correlation_id: z nagłówka `x-request-id` (requestIdHeader) albo losowy.
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // OpenAPI budowany ze schematów Zod tras — nigdy pisany ręcznie (spec sekcja 8).
  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.1.0",
      info: { title: "API", version: "0.0.0" },
      servers: [{ url: "/" }],
    },
    transform: jsonSchemaTransform,
  });

  app.setErrorHandler(createErrorHandler(errorTracker));
  app.setNotFoundHandler(notFoundHandler);

  // Odsyłamy correlation_id do klienta, by można było skorelować logi z requestem.
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(healthRoutes);
  await app.register(apiV1Routes, { prefix: "/api/v1" });

  app.get("/api/v1/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  return app;
}
