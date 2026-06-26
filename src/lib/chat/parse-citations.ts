/**
 * Extracts inline citation markers like [1], [2,5], [3, 7, 9], tolerating
 * whitespace inside the brackets, and returns the unique sorted marker numbers.
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
 * Returns citation marker numbers in document order, including duplicates
 * (so [1][1] yields [1, 1]).
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
