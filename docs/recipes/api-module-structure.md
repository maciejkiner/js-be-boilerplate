# Przepis: struktura modułu API

Jak dodać moduł domenowy do `apps/api`. To szkic wzorca — w Fazie 4 powstanie pełny moduł
referencyjny (encja), a w Fazie 8 ten przepis stanie się specyfikacją scaffoldera.

> Konwencja: **katalog = moduł**. Trasy to `FastifyPluginAsyncZod`. Wpływ na istniejące pliki =
> jedna linia rejestracji przy kotwicy (registry pattern, bez parsowania AST).

## Kroki

1. **Utwórz katalog** `src/modules/<nazwa>/` (np. `products`).

2. **Zdefiniuj trasy** w `src/modules/<nazwa>/<nazwa>.routes.ts`:

   ```ts
   import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
   import { z } from "zod";

   export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
     app.get(
       "/products",
       { schema: { tags: ["products"], response: { 200: /* schemat listy */ } } },
       async () => {
         /* warstwa service → repository */
       },
     );
   };
   ```

   - Walidacja i typy z Zoda w `schema.{body,querystring,params,response}`.
   - Listy: użyj `PaginationQuerySchema` i `paginatedResponse(item)` z `lib/http/pagination.js`.
   - Błędy: rzucaj podklasy `AppError` (`NotFoundError`, `ConflictError`, …) z `lib/http/problem.js` —
     globalny handler zmapuje je na RFC 7807. Nie buduj odpowiedzi błędu ręcznie.

3. **Zarejestruj moduł** w `src/modules/index.ts` — dopisz **jedną linię** przy kotwicy:

   ```ts
   // import na górze pliku:
   import { productsRoutes } from "./products/products.routes.js";

   // wewnątrz apiV1Routes, przy kotwicy:
   await app.register(productsRoutes);
   // scaffolder:entities-register — do not remove
   ```

   Moduł zamontuje się pod `/api/v1` (prefix nadaje `app.ts`).

4. **Testy** (Vitest, `test/`): zbuduj app przez `buildApp` (patrz `test/helpers.ts`), użyj
   `app.inject(...)`. Pokryj happy-path, walidację (400) i błędy domenowe.

5. **Dokumentacja**: OpenAPI aktualizuje się automatycznie ze schematów tras
   (`GET /api/v1/openapi.json`). Uzupełnij README modułu, jeśli ma nieoczywiste reguły.

## Uwagi

- Import względny w ESM wymaga rozszerzenia `.js` (NodeNext).
- `/health` jest celowo poza `/api/v1` (endpoint infrastrukturalny, bez wersjonowania).
