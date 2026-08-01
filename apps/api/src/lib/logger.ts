import type { FastifyServerOptions } from "fastify";
import type { Env } from "../config/env.js";

/**
 * Options for the structured logger (pino, JSON). Sensitive headers are redacted — we never log
 * tokens or cookies.
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
