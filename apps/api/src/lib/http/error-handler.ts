import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import type { ErrorTracker } from "../error-tracking/index.js";
import { AppError, PROBLEM_CONTENT_TYPE, type ProblemDetails } from "./problem.js";

type ErrorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;

/**
 * Globalny handler błędów → RFC 7807. Mapuje w kolejności:
 * 1) walidacja żądania (Zod) → 400 z listą `errors`,
 * 2) błąd serializacji odpowiedzi = bug serwera → 500 (bez ujawniania kontraktu),
 * 3) błędy domenowe (`AppError`) → ich status/tytuł,
 * 4) błędy HTTP z `statusCode` < 500 → problem z tym statusem,
 * 5) reszta → 500 bez wycieku detali; zawsze log + raport do trackera dla 5xx.
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

/** Handler nieznanych tras → 404 problem+json (spójnie z resztą). */
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
