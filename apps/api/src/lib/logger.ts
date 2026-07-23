import type { FastifyServerOptions } from "fastify";
import type { Env } from "../config/env.js";

/**
 * Opcje structured loggera (pino, JSON). Wrażliwe nagłówki są usuwane z logów —
 * nigdy nie logujemy tokenów ani ciasteczek.
 */
export function buildLoggerOptions(env: Env): FastifyServerOptions["logger"] {
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
      remove: true,
    },
  };
}
