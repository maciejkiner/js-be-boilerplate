import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // The integration tests share ONE Postgres (compose locally, a service in CI).
    // Files that mutate shared tables (a TRUNCATE users, say) must not run in parallel, because they
    // would wipe each other's data. Sequential files mean deterministic entity tests — which matters
    // because the scaffolder generates further tests against the same database.
    fileParallelism: false,
  },
});
