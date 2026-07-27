import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Zapisuje nowy plik; NIE nadpisuje istniejącego (bez inteligentnego mergowania). */
export function writeNew(path: string, content: string): void {
  if (existsSync(path)) {
    throw new Error(
      `Plik już istnieje: ${path} — scaffolder nie nadpisuje. Usuń go, by wygenerować ponownie.`,
    );
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

/**
 * Wstawia `line` bezpośrednio przed linią z kotwicą `anchor`. Idempotentnie: pomija, gdy plik już
 * zawiera `dedupeKey` (stabilny token odporny na reformatowanie Prettiera — np. ścieżka importu).
 * Bez `dedupeKey` porównuje po treści linii.
 */
export function insertBeforeAnchor(
  path: string,
  anchor: string,
  line: string,
  dedupeKey?: string,
): void {
  const src = readFileSync(path, "utf8");
  if (src.includes(dedupeKey ?? line.trim())) {
    return;
  }
  const idx = src.indexOf(anchor);
  if (idx === -1) {
    throw new Error(`Brak kotwicy "${anchor}" w ${path}.`);
  }
  const lineStart = src.lastIndexOf("\n", idx) + 1;
  const anchorLineEnd = src.indexOf("\n", idx);
  const anchorLine = src.slice(lineStart, anchorLineEnd === -1 ? undefined : anchorLineEnd);
  const indent = anchorLine.match(/^\s*/)?.[0] ?? ""; // samo wcięcie, bez `// ` kotwicy
  const updated = `${src.slice(0, lineStart)}${indent}${line}\n${src.slice(lineStart)}`;
  writeFileSync(path, updated);
}
