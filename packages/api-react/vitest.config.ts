import { defineConfig } from "vitest/config";

export default defineConfig({
  // Automatic JSX runtime (react/jsx-runtime) — spójnie z tsconfig "jsx": "react-jsx".
  esbuild: { jsx: "automatic" },
  test: {
    // Hooki React Query wymagają DOM — jsdom dla testów renderujących.
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
