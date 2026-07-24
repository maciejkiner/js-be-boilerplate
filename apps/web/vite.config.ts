import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Domyślna skorupa na osobnym origin — port 5173 = WEB_ORIGIN w API (CORS dwa originy).
// Port nadpisywalny przez PORT (kolizje dev / e2e na alternatywnych portach).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: Number(process.env.PORT ?? "5173"), strictPort: true },
});
