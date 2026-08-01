import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The default shell on its own origin — port 5173 is WEB_ORIGIN in the API (CORS for two origins).
// The port can be overridden with PORT (dev collisions, e2e on alternative ports).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.PORT ?? "5173"),
    strictPort: true,
    // host: listen on 0.0.0.0 — reachable from a container (and safe natively too).
    host: true,
    // In a container (a bind mount on macOS/Windows) fs events are unreliable → polling on demand.
    watch: process.env.VITE_USE_POLLING ? { usePolling: true } : undefined,
  },
});
