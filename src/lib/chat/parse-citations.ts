/**
 * Extracts inline citation markers like [1], [2,5], [3, 7, 9] from a
 * synthesis string. The synthesis prompt instructs the LLM to use this
 * exact format; the parser is forgiving of optional whitespace inside the
 * brackets.
 *
 * Returns the unique sorted list of marker numbers actually used.
 */
export function extractCitationMarkers(text: string): number[] {
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  const found = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const inner = match[1]!;
    for (const part of inner.split(",")) {
      const n = Number(part.trim());
      if (Number.isFinite(n) && n > 0) found.add(n);
    }
  }
  return Array.from(found).sort((a, b) => a - b);
}

/**
 * Returns an array of citation marker numbers in document order, including
 * duplicates (so [1][1] yields [1, 1]). Useful when computing how many
 * times the model cited each source.
 */
export function listCitationMarkersInOrder(text: string): number[] {
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  const out: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const inner = match[1]!;
    for (const part of inner.split(",")) {
      const n = Number(part.trim());
      if (Number.isFinite(n) && n > 0) out.push(n);
    }
  }
  return out;
}
