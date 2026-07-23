import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

/**
 * Rejestr modułów domenowych montowanych pod `/api/v1`.
 *
 * Scaffolder dopisuje rejestracje przy kotwicy poniżej — konwencja + kotwica
 * zamiast parsowania AST (spec sekcja 6). Pierwszy moduł powstaje w Fazie 4.
 *
 * Wzorzec dodania modułu:
 *   import { productsRoutes } from "./products/products.routes.js";
 *   await app.register(productsRoutes);
 */
export const apiV1Routes: FastifyPluginAsyncZod = async (_app) => {
  // scaffolder:entities-register — do not remove
};
