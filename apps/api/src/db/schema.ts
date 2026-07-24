/**
 * Agreguje schematy Drizzle wszystkich modułów domenowych — dla drizzle-kit
 * (generowanie migracji) oraz typowania klienta. Scaffolder dopisuje re-eksport
 * schematu modułu przy kotwicy. Pierwsza tabela: `users` (Faza 3).
 *
 * Wzorzec:
 *   export * from "../modules/products/products.schema.js";
 */

export * from "../modules/auth/auth.schema.js";
export * from "../modules/projects/projects.schema.js";
export * from "../modules/tasks/tasks.schema.js";
// scaffolder:schema-export — do not remove
