import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Admin na osobnym origin (subdomena) — domyślny port 5174 = ADMIN_ORIGIN w API.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
});
