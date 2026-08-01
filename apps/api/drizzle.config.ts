import { defineConfig } from "drizzle-kit";

// Konfiguracja drizzle-kit (generowanie/apply migracji, studio).
// We point at the COMPILED schema (dist), because drizzle-kit does not resolve the extensions
// the `.js` in source imports (NodeNext ESM). The db:* scripts build before running.
// DATABASE_URL from the env (falling back to docker-compose) — the CLI skips the app's validation.
export default defineConfig({
  dialect: "postgresql",
  schema: "./dist/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
  },
});
