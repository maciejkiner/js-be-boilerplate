import tseslint from "typescript-eslint";
import base from "./eslint-base.js";

/**
 * The configuration for the `packages/*` packages.
 *
 * It enforces the frontend shell replaceability boundary (specification, section 4): inside
 * `packages/` you must NOT import a router or use bundler specifics. React is allowed; TanStack
 * Query is allowed. The environment is injected explicitly when the shell initialises — never
 * through `import.meta.env` inside a package.
 *
 * Every package consumes this config from its own `eslint.config.js`, so the rule
 * applies when linting from the package directory (turbo run lint) regardless of the CWD.
 */
export default tseslint.config(...base, {
  files: ["**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@tanstack/react-router",
            message:
              "Import routera zakazany w packages/* — routing żyje w skorupach apps/*. (spec sekcja 4)",
          },
        ],
        patterns: [
          {
            group: ["@tanstack/react-router", "@tanstack/react-router/*"],
            message:
              "Import routera zakazany w packages/* — routing żyje w skorupach apps/*. (spec sekcja 4)",
          },
        ],
      },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: 'MemberExpression[object.type="MetaProperty"][property.name="env"]',
        message:
          "import.meta.env zakazany w packages/* — env wstrzykiwany jawnie przy inicjalizacji skorupy. (spec sekcja 4)",
      },
    ],
  },
});
