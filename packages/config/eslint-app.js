import base from "./eslint-base.js";

/**
 * The configuration for the `apps/*` shells (Vite/Node).
 * A shell may use a router and `import.meta.env` — it is the shell that injects the environment into
 * the packages. For now it is identical to the base; it exists as its own file so the shells have a
 * stable extension point (React or a11y rules, say) without touching the packages boundary.
 */
export default base;
