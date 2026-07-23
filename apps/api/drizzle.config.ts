import { defineConfig } from "drizzle-kit";

// Konfiguracja drizzle-kit (generowanie/apply migracji, studio).
// DATABASE_URL bierzemy z env (fallback = docker-compose) — CLI nie przechodzi
// przez walidację aplikacji, więc podajemy tu sensowny domyślny adres dev.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
  },
});
