import tseslint from "typescript-eslint";
import base from "./eslint-base.js";

/**
 * Konfiguracja dla pakietów `packages/*`.
 *
 * Egzekwuje granicę wymienialności skorupy FE (spec sekcja 4):
 * w `packages/` NIE wolno importować routera ani używać bundler-specyfiki.
 * React jest dozwolony; TanStack Query jest dozwolony. Env wstrzykiwany jawnie
 * przez inicjalizację skorupy — nigdy przez `import.meta.env` w pakiecie.
 *
 * Każdy pakiet konsumuje ten config w swoim `eslint.config.js`, więc reguła
 * działa przy lintowaniu z katalogu pakietu (turbo run lint) niezależnie od CWD.
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
