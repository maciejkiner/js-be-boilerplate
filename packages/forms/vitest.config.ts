import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // renderHook (React) wymaga DOM.
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
