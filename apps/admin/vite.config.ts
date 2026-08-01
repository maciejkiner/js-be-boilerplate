import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Admin lives on its own origin (a subdomain) — the default port 5174 is ADMIN_ORIGIN in the API.
// The port can be overridden with PORT (dev collisions, e2e on alternative ports).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Informacje techniczne wstrzykiwane w czasie budowania/startu dev (stopka panelu).
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: Number(process.env.PORT ?? "5174"),
    strictPort: true,
    // host: listen on 0.0.0.0 — reachable from a container (and safe natively too).
    host: true,
    // In a container (a bind mount on macOS/Windows) fs events are unreliable → polling on demand.
    watch: process.env.VITE_USE_POLLING ? { usePolling: true } : undefined,
  },
});
