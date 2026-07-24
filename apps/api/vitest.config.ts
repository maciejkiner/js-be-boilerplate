import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Testy integracyjne dzielą JEDEN Postgres (lokalnie compose, w CI service).
    // Pliki mutujące wspólne tabele (np. TRUNCATE users) nie mogą biec równolegle,
    // bo się nawzajem czyszczą. Sekwencyjne pliki = deterministyczne testy encji
    // (istotne, bo scaffolder w Fazie 8 generuje kolejne testy na tej samej bazie).
    fileParallelism: false,
  },
});
