import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import type { ErrorTracker } from "../error-tracking/index.js";
import { AppError, PROBLEM_CONTENT_TYPE, type ProblemDetails } from "./problem.js";

type ErrorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;

/**
 * The global error handler → RFC 7807. It maps, in order:
 * 1) request validation (Zod) → 400 with an `errors` list,
 * 2) a response serialization error, meaning a server bug → 500 (without leaking the contract),
 * 3) domain errors (`AppError`) → their status and title,
 * 4) HTTP errors with `statusCode` < 500 → a problem with that status,
 * 5) everything else → 500 without leaking details; 5xx is always logged and reported to the tracker.
 */
export function createErrorHandler(errorTracker: ErrorTracker): ErrorHandler {
  return function errorHandler(error, request, reply) {
    const instance = request.url;

    if (hasZodFastifySchemaValidationErrors(error)) {
      sendProblem(reply, {
        type: "about:blank",
        title: "Validation Error",
        status: 400,
        detail: "Żądanie nie przeszło walidacji schematu.",
        instance,
        errors: error.validation.map((entry) => ({
          path: entry.params.issue.path.join("."),
          message: entry.params.issue.message,
          code: entry.params.issue.code,
        })),
      });
      return;
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, "Response serialization error");
      errorTracker.captureException(error, { reqId: request.id, instance });
      sendProblem(reply, internalProblem(instance));
      return;
    }

    if (error instanceof AppError) {
      if (error.status >= 500) {
        request.log.error({ err: error }, error.title);
        errorTracker.captureException(error, { reqId: request.id, instance });
      }
      sendProblem(reply, {
        type: error.type,
        title: error.title,
        status: error.status,
        detail: error.detail,
        instance,
        ...error.extensions,
      });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      sendProblem(reply, {
        type: "about:blank",
        title: error.name || "Error",
        status: statusCode,
        detail: error.message,
        instance,
      });
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    errorTracker.captureException(error, { reqId: request.id, instance });
    sendProblem(reply, internalProblem(instance));
  };
}

/** The handler for unknown routes → a 404 problem+json (consistent with the rest). */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply): void {
  sendProblem(reply, {
    type: "about:blank",
    title: "Not Found",
    status: 404,
    detail: `Nie znaleziono zasobu: ${request.method} ${request.url}`,
    instance: request.url,
  });
}

function sendProblem(reply: FastifyReply, problem: ProblemDetails): void {
  void reply.status(problem.status).header("content-type", PROBLEM_CONTENT_TYPE).send(problem);
}

function internalProblem(instance: string): ProblemDetails {
  return { type: "about:blank", title: "Internal Server Error", status: 500, instance };
}
