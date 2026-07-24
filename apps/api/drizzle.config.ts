import { defineConfig } from "drizzle-kit";

// Konfiguracja drizzle-kit (generowanie/apply migracji, studio).
// Wskazujemy SKOMPILOWANY schemat (dist), bo drizzle-kit nie rozwiązuje rozszerzeń
// `.js` w importach źródeł (NodeNext ESM). Skrypty db:* budują przed uruchomieniem.
// DATABASE_URL z env (fallback = docker-compose) — CLI nie przechodzi przez walidację app.
export default defineConfig({
  dialect: "postgresql",
  schema: "./dist/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
  },
});
