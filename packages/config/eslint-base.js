import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Bazowa, współdzielona konfiguracja ESLint (flat config).
 * Rozszerzana przez `eslint-package` (pakiety `packages/*`) i `eslint-app` (skorupy `apps/*`).
 */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**", "**/*.gen.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
);
