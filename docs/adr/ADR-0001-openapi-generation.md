# ADR-0001: Generowanie OpenAPI ze schematów Zod

- **Status:** Accepted
- **Date:** 2026-07-23
- **Authors:** zespół bootstrap
- **Related:** spec sekcje 5 i 8, Faza 1

## Context

Spec wymaga, by spec OpenAPI był **generowany ze schematów Zod, nigdy pisany ręcznie**
(jedno źródło prawdy), i wymienia dwie biblioteki: `fastify-type-provider-zod` (walidacja/typy
req/res) oraz `zod-openapi` (generowanie OpenAPI). Trzeba było zdecydować, jak je złożyć w
Fastify tak, aby jedne schematy Zod tras napędzały jednocześnie walidację, serializację i OpenAPI.

## Considered options

1. **`fastify-type-provider-zod` + `@fastify/swagger`** — type provider dostarcza
   `validatorCompiler`/`serializerCompiler` oraz `jsonSchemaTransform`; `@fastify/swagger` zbiera
   trasy i emituje dokument OpenAPI z tego transformu. Jeden spójny provider.
   Pros: jedna warstwa integracji Zod↔Fastify, minimalny kod, dobrze utrzymane.
   Cons: dokument budowany przez konwersję Zod→JSON Schema (bez natywnych rozszerzeń `zod-openapi`).
2. **`zod-openapi` + `fastify-zod-openapi`** — bogatsze metadane OpenAPI (`.openapi()`) na
   schematach. Pros: pełniejsza kontrola nad specem. Cons: druga warstwa integracji obok/zamiast
   type-providera; ryzyko konfliktu dwóch providerów; więcej maszynerii.

## Decision

Wybieramy **opcję 1**. Rolę „Zod → OpenAPI" realizuje `jsonSchemaTransform` z
`fastify-type-provider-zod` spięty z `@fastify/swagger`. To spełnia intencję spec (OpenAPI
generowany ze schematów, jedno źródło prawdy) bez utrzymywania dwóch nakładających się warstw
integracji Zod z Fastify. Gdyby projekt potrzebował bogatszych metadanych OpenAPI, migracja do
`zod-openapi` jest lokalna (warstwa app + rejestracja swaggera).

## Consequences

- **Positive:** te same schematy Zod tras napędzają walidację req/res, serializację, typy i OpenAPI;
  jedna zależność integracyjna; klient generowany z tego samego spec (Faza 5).
- **Negative / costs:** rezygnujemy z natywnych rozszerzeń `zod-openapi`; wzbogacanie specu
  (opisy, przykłady) idzie przez metadane schematów/tras Fastify.
- **Impact:** apps/api (rejestracja swaggera), Faza 5 (generacja klienta z `/api/v1/openapi.json`).
