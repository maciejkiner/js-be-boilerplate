import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * The shared base ESLint configuration (flat config).
 * Extended by `eslint-package` (the `packages/*` packages) and `eslint-app` (the `apps/*` shells).
 */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**", "**/*.gen.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Convention: arguments and variables prefixed with `_` are deliberately unused.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  prettier,
);
