import { defineConfig } from "vitest/config";

export default defineConfig({
  // Automatic JSX runtime (react/jsx-runtime) — consistent with tsconfig "jsx": "react-jsx".
  esbuild: { jsx: "automatic" },
  test: {
    // React Query hooks need a DOM — jsdom for the rendering tests.
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
