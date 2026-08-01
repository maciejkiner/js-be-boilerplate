import { execFileSync } from "node:child_process";

/**
 * Seeds the admin account before the tests. The panel (users, roles) is `admin`-only, and
 * registering through the API only ever grants the `user` role — without this step no view behind
 * RBAC can be tested. The seeder is idempotent, so rerunning the suite breaks nothing.
 */
export default function globalSetup(): void {
  execFileSync("pnpm", ["--filter", "@repo/api", "db:seed"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
    },
  });
}
