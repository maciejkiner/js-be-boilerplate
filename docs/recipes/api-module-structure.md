[Home](../../README.md) › [Documentation](../README.md) › [Recipes](./README.md) › API module structure

# Recipe: the structure of an API module

How to add a domain module to `apps/api`. This is the pattern the scaffolder follows — if you are
adding a whole entity, use [How to add an entity](./how-to-add-an-entity.md) instead and let the
generator write these files for you.

> Convention: **a directory is a module**. Routes are a `FastifyPluginAsyncZod`. The impact on
> existing files is a single registration line at an anchor (registry pattern, no AST parsing).

## Steps

1. **Create the directory** `src/modules/<name>/` (for example `products`).

2. **Define the routes** in `src/modules/<name>/<name>.routes.ts`:

   ```ts
   import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
   import { z } from "zod";

   export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
     app.get(
       "/products",
       { schema: { tags: ["products"], response: { 200: /* list schema */ } } },
       async () => {
         /* service → repository */
       },
     );
   };
   ```

   - Validation and types come from Zod in `schema.{body,querystring,params,response}`.
   - Lists: use `PaginationQuerySchema` and `paginatedResponse(item)` from `lib/http/pagination.js`.
   - Errors: throw `AppError` subclasses (`NotFoundError`, `ConflictError`, …) from
     `lib/http/problem.js` — the global handler maps them to RFC 7807. Never build an error response
     by hand.

3. **Register the module** in `src/modules/index.ts` — **one line** at the anchor:

   ```ts
   // import at the top of the file:
   import { productsRoutes } from "./products/products.routes.js";

   // inside apiV1Routes, at the anchor:
   await app.register(productsRoutes);
   // scaffolder:entities-register — do not remove
   ```

   The module is mounted under `/api/v1` (the prefix comes from `app.ts`).

4. **Tests** (Vitest, `test/`): build the app with `buildApp` (see `test/helpers.ts`) and drive it
   through `app.inject(...)`. Cover the happy path, validation (400) and domain errors.

5. **Documentation**: OpenAPI updates itself from the route schemas
   (`GET /api/v1/openapi.json`). Extend the module README if it carries non-obvious rules.

## Errors that point at a field

`detail` is what a human reads; the `errors` extension (`[{ path, message }]`) is what a form reads.
Whenever an error concerns specific input fields, include it — the shells map it onto the offending
control automatically:

```ts
throw new BadRequestError("The room is already booked in that slot.", {
  errors: [{ path: "roomId", message: "This room is taken." }],
});
```

For uniqueness conflicts use `uniqueConflictError(label, fields)` from `src/db/unique-violation.ts`,
which builds both halves for you. Details on the client side:
[How to define a form](./how-to-define-a-form.md).

## Notes

- Relative imports in ESM need the `.js` extension (NodeNext).
- `/health` sits outside `/api/v1` on purpose: it is infrastructure, not a versioned API.

## Related

- [How to add an entity](./how-to-add-an-entity.md) — the generated version of this whole recipe
- [How to add a migration](./how-to-add-a-migration.md) — the data layer underneath the module
- [How to regenerate the API client](./how-to-regenerate-the-api-client.md) — what to run after the API changes
- [`apps/api/README.md`](../../apps/api/README.md) — the layout of the API application
