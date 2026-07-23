import base from "./eslint-base.js";

/**
 * Konfiguracja dla skorup `apps/*` (Vite/Node).
 * Skorupa może używać routera i `import.meta.env` — to ona wstrzykuje env do pakietów.
 * Na razie identyczna z bazą; własny plik istnieje, by skorupy miały stabilny punkt
 * rozszerzeń (np. reguły React/a11y) bez ruszania granicy pakietów.
 */
export default base;
