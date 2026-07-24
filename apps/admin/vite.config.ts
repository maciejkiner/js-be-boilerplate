import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Admin na osobnym origin (subdomena) — domyślny port 5174 = ADMIN_ORIGIN w API.
// Port nadpisywalny przez PORT (kolizje dev / e2e na alternatywnych portach).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT ?? "5174"), strictPort: true },
});
