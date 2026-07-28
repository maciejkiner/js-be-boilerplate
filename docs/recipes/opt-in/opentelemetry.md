# Opt-in: OpenTelemetry (tracing)

**Nie zaimplementowane w bootstrapie.** Error-tracking (Sentry przez abstrakcję) jest wpięty od
Fazy 1; **tracing (OTel)** to osobny, opcjonalny moduł. Włącz, gdy potrzebujesz rozproszonego
śledzenia ścieżek.

## Przepis (skrót)

1. Zależności: `@opentelemetry/sdk-node`, auto-instrumentacje (`@opentelemetry/auto-instrumentations-node`)
   — instrumentują Fastify, `pg`, HTTP „za darmo".
2. **Inicjalizacja przed resztą** (`apps/api/src/otel.ts`), ładowana najwcześniej (np. `--import`
   albo pierwszy import w `server.ts`), skonfigurowana z env:
   ```ts
   // start SDK gdy OTEL_EXPORTER_OTLP_ENDPOINT ustawiony; inaczej no-op
   ```
3. **Env:** `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` (dodaj do `EnvSchema` jako opcjonalne).
4. **Korelacja:** most na istniejący `correlation_id` (reqId pino) → atrybut spanu / trace-id w logach.
5. **Collector (dev):** usługa OTel Collector / Jaeger w docker-compose (opt-in), do podglądu.

## Uwagi

Bez ustawionego endpointu — SDK nie startuje (no-op), zero narzutu. Nie eksportuj PII w atrybutach
spanów. Tracing ≠ error-tracking — oba mogą działać równolegle.
