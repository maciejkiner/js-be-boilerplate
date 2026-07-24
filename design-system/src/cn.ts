/** Łączy klasy CSS, pomijając wartości fałszywe. Minimalny odpowiednik `clsx` (bez zależności). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
