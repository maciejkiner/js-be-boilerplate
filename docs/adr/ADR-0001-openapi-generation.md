[Home](../../README.md) › [Documentation](../README.md) › [Architecture decisions](./README.md) › ADR-0001

# ADR-0001: Generating OpenAPI from the Zod schemas

- **Status:** Accepted
- **Date:** 2026-07-23
- **Authors:** bootstrap team
- **Related:** specification sections 5 and 8, phase 1

## Context

The specification requires the OpenAPI document to be **generated from the Zod schemas, never written
by hand** (a single source of truth), and names two libraries: `fastify-type-provider-zod`
(request/response validation and types) and `zod-openapi` (OpenAPI generation). We had to decide how
to combine them inside Fastify so that one set of route schemas drives validation, serialization and
OpenAPI at the same time.

## Considered options

1. **`fastify-type-provider-zod` + `@fastify/swagger`** — the type provider supplies
   `validatorCompiler`/`serializerCompiler` and `jsonSchemaTransform`; `@fastify/swagger` collects the
   routes and emits the OpenAPI document from that transform. One coherent provider.
   Pros: a single Zod ↔ Fastify integration layer, minimal code, well maintained.
   Cons: the document is built by converting Zod → JSON Schema, without the native `zod-openapi`
   extensions.
2. **`zod-openapi` + `fastify-zod-openapi`** — richer OpenAPI metadata (`.openapi()`) on the schemas.
   Pros: fuller control over the specification. Cons: a second integration layer next to (or instead
   of) the type provider; a risk of two providers conflicting; more machinery.

## Decision

We choose **option 1**. The "Zod → OpenAPI" role is played by `jsonSchemaTransform` from
`fastify-type-provider-zod` wired into `@fastify/swagger`. That satisfies the intent of the
specification (OpenAPI generated from the schemas, one source of truth) without maintaining two
overlapping Zod-to-Fastify integration layers. Should a project need richer OpenAPI metadata,
migrating to `zod-openapi` is a local change (the app layer plus the swagger registration).

## Consequences

- **Positive:** the same route schemas drive request/response validation, serialization, types and
  OpenAPI; one integration dependency; the client is generated from that same specification
  (phase 5).
- **Negative / costs:** we give up the native `zod-openapi` extensions; enriching the specification
  (descriptions, examples) goes through Fastify schema and route metadata.
- **Impact:** apps/api (the swagger registration) and phase 5 (client generation from
  `/api/v1/openapi.json`).

## Related

- [Architecture decisions](./README.md) — the full index
- [How to regenerate the API client](../recipes/how-to-regenerate-the-api-client.md) — the process this enables
- [`apps/api`](../../apps/api/README.md) — where the decision lives in code
