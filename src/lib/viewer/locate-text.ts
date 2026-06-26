/**
 * Finds a DOM Range covering `quote` within a container's rendered text,
 * tolerant of whitespace differences. Used to highlight the exact cited text
 * in a PDF page's text layer (rather than the coarse chunk bounding box).
 *
 * Matching is whitespace-collapsed and case-insensitive; the returned range
 * spans the matched characters across whatever text nodes they fall in.
 */
const MIN_MATCH_LEN = 4;

export function findQuoteRange(container: HTMLElement, quote: string): Range | null {
  const target = quote.replace(/\s+/g, " ").trim().toLowerCase();
  if (target.length < MIN_MATCH_LEN) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let normalized = "";
  // positions[i] = the raw {node, offset} that normalized char i came from.
  const positions: { node: Text; offset: number }[] = [];
  let pendingSpace = false;

  let n: Node | null;
  while ((n = walker.nextNode()) !== null) {
    const node = n as Text;
    const value = node.nodeValue ?? "";
    for (let i = 0; i < value.length; i++) {
      const ch = value[i]!;
      if (/\s/.test(ch)) {
        pendingSpace = normalized.length > 0;
        continue;
      }
      if (pendingSpace) {
        normalized += " ";
        positions.push({ node, offset: i });
        pendingSpace = false;
      }
      normalized += ch.toLowerCase();
      positions.push({ node, offset: i });
    }
  }

  const idx = normalized.indexOf(target);
  if (idx === -1) return null;
  const start = positions[idx];
  const end = positions[idx + target.length - 1];
  if (!start || !end) return null;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset + 1);
  return range;
}
