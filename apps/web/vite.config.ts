import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Domyślna skorupa na osobnym origin — port 5173 = WEB_ORIGIN w API (CORS dwa originy).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
