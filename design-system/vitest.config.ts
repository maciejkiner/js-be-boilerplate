import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    // globals: true → @testing-library/react rejestruje auto-cleanup po każdym teście
    // (inaczej portale Modala i węzły kumulują się między testami).
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
