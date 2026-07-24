// packages/* — obowiązuje granica: bez routera i import.meta.env.
import pkg from "@repo/config/eslint-package";

export default [
  // Kod generowany z OpenAPI — nie lintujemy.
  { ignores: ["src/generated/**"] },
  ...pkg,
];
