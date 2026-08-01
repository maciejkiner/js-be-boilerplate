// packages/* — the boundary applies: no router and no import.meta.env.
import pkg from "@repo/config/eslint-package";

export default [
  // Code generated from OpenAPI — not linted.
  { ignores: ["src/generated/**"] },
  ...pkg,
];
