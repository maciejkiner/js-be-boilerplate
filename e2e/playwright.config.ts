import { defineConfig, devices } from "@playwright/test";

// Configurable ports (like POSTGRES_PORT) — the defaults suit CI (where they are free) and can be
// overridden locally on a collision with another project: E2E_API_PORT / E2E_WEB_PORT / E2E_ADMIN_PORT.
const apiPort = process.env.E2E_API_PORT ?? "3000";
const webPort = process.env.E2E_WEB_PORT ?? "5173";
const adminPort = process.env.E2E_ADMIN_PORT ?? "5174";

const API = `http://localhost:${apiPort}`;
const WEB = `http://localhost:${webPort}`;
const ADMIN = `http://localhost:${adminPort}`;

// Expose the URLs to the tests (helpers, two-origins) — the config and the workers share process.env.
process.env.E2E_API_URL = API;
process.env.E2E_WEB_URL = WEB;
process.env.E2E_ADMIN_URL = ADMIN;

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
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
