import { randomUUID } from "node:crypto";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import Fastify, { type FastifyInstance } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { Env } from "./config/env.js";
import type { Db } from "./db/client.js";
import type { ErrorTracker } from "./lib/error-tracking/index.js";
import { createErrorHandler, notFoundHandler } from "./lib/http/error-handler.js";
import { buildLoggerOptions } from "./lib/logger.js";
import type { Mailer } from "./lib/mailer/index.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { authenticate } from "./modules/auth/authenticate.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { apiV1Routes } from "./modules/index.js";

export interface BuildAppOptions {
  env: Env;
  errorTracker: ErrorTracker;
  db: Db;
  mailer: Mailer;
}

/**
 * Składa instancję Fastify z konwencjami bootstrapu: walidacja/serializacja przez
 * Zod, structured logi, OpenAPI ze schematów, CORS (web + admin), auth (cookie/JWT),
 * globalny handler błędów, moduły domenowe z rejestru pod `/api/v1`. Nie startuje nasłuchu.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { env, errorTracker, db, mailer } = options;

  const app = Fastify({
    logger: buildLoggerOptions(env),
    // reqId = correlation_id: z nagłówka `x-request-id` (requestIdHeader) albo losowy.
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // CORS na dwa originy (web + admin) z ciasteczkami — admin na subdomenie od dnia pierwszego.
  await app.register(fastifyCors, {
    origin: [env.WEB_ORIGIN, env.ADMIN_ORIGIN],
    credentials: true,
  });
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: "access_token", signed: false },
  });
  app.decorate("authenticate", authenticate);

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
  await app.register(authRoutes({ db, env, mailer }), { prefix: "/api/v1/auth" });
  await app.register(apiV1Routes, { prefix: "/api/v1" });

  app.get("/api/v1/openapi.json", { schema: { hide: true } }, async () => app.swagger());

  return app;
}
