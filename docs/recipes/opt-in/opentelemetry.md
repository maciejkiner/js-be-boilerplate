[Home](../../../README.md) › [Documentation](../../README.md) › [Recipes](../README.md) › [Opt-in](./README.md) › OpenTelemetry

# Opt-in: OpenTelemetry (tracing)

**Not implemented in the bootstrap.** Error tracking (Sentry behind an abstraction) has been wired in
since phase 1; **tracing (OTel)** is a separate, optional module. Turn it on when you need
distributed tracing across services.

## The recipe in short

1. Dependencies: `@opentelemetry/sdk-node` and the auto-instrumentations
   (`@opentelemetry/auto-instrumentations-node`), which instrument Fastify, `pg` and HTTP for free.
2. **Initialise before anything else** (`apps/api/src/otel.ts`), loaded as early as possible (through
   `--import`, or as the first import in `server.ts`), configured from the environment:
   ```ts
   // start the SDK when OTEL_EXPORTER_OTLP_ENDPOINT is set; otherwise no-op
   ```
3. **Environment:** `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` (add both to `EnvSchema` as
   optional).
4. **Correlation:** bridge the existing `correlation_id` (pino's `reqId`) into a span attribute, and
   the trace id into the logs.
5. **Collector (dev):** an OTel Collector or Jaeger service in docker-compose (opt-in), for local
   inspection.

## Notes

Without an endpoint configured the SDK does not start (no-op), so there is no overhead. Do not export
PII in span attributes. Tracing is not error tracking — the two run side by side.

## Related

- [Opt-in modules](./README.md) — the rules that apply to all of these
- [`apps/api/README.md`](../../../apps/api/README.md) — logging and error tracking as they exist today
- [How to run in Docker](../how-to-run-in-docker.md) — where a collector service would be added
