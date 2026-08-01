import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Writes a new file; it does NOT overwrite an existing one (no clever merging). */
export function writeNew(path: string, content: string): void {
  if (existsSync(path)) {
    throw new Error(
      `File already exists: ${path} — the scaffolder never overwrites. Delete it to regenerate.`,
    );
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

/**
 * Inserts `line` directly above the line holding the `anchor`. Idempotent: it skips when the file
 * already contains `dedupeKey` (a stable token that survives Prettier reformatting — an import path,
 * for example). Without `dedupeKey` it compares the line content.
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
  const indent = anchorLine.match(/^\s*/)?.[0] ?? ""; // the indent alone, without the `// ` anchor
  const updated = `${src.slice(0, lineStart)}${indent}${line}\n${src.slice(lineStart)}`;
  writeFileSync(path, updated);
}
