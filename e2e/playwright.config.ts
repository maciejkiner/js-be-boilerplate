import { defineConfig, devices } from "@playwright/test";

// Porty konfigurowalne (jak POSTGRES_PORT) — domyślne dla CI (wolne), nadpisywalne lokalnie
// przy kolizji z innymi projektami: E2E_API_PORT / E2E_WEB_PORT / E2E_ADMIN_PORT.
const apiPort = process.env.E2E_API_PORT ?? "3000";
const webPort = process.env.E2E_WEB_PORT ?? "5173";
const adminPort = process.env.E2E_ADMIN_PORT ?? "5174";

const API = `http://localhost:${apiPort}`;
const WEB = `http://localhost:${webPort}`;
const ADMIN = `http://localhost:${adminPort}`;

// Udostępnij URL-e testom (helpers / two-origins) — config i workery dzielą process.env.
process.env.E2E_API_URL = API;
process.env.E2E_WEB_URL = WEB;
process.env.E2E_ADMIN_URL = ADMIN;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: ADMIN, trace: "on-first-retry" },
  webServer: [
    {
      command: "pnpm --filter @repo/api dev",
      url: `${API}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
        JWT_SECRET: "e2e-secret-please-change-32-characters-long",
        PORT: apiPort,
        WEB_ORIGIN: WEB,
        ADMIN_ORIGIN: ADMIN,
        COOKIE_SECURE: "false",
        LOG_LEVEL: "warn",
      },
    },
    {
      command: "pnpm --filter @repo/admin dev",
      url: ADMIN,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_URL: API, PORT: adminPort },
    },
    {
      command: "pnpm --filter @repo/web dev",
      url: WEB,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_API_URL: API, PORT: webPort },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
