/**
 * Finds a DOM Range covering `quote` within a container's rendered text,
 * tolerant of whitespace and markdown differences. Used to highlight the exact
 * cited text in a PDF page's text layer (rather than the coarse chunk bounding
 * box, whose LlamaParse coordinates don't map cleanly onto the pdf.js viewport).
 *
 * The stored quote is LlamaParse markdown (headings, bold, tables), while the
 * text layer is plain text, so the quote is markdown-stripped before matching.
 * Matching is whitespace-collapsed and case-insensitive. A full-quote match is
 * tried first, then progressively shorter prefixes: LlamaParse and pdf.js text
 * extraction diverge over long spans (and a chunk can run past the page break),
 * so the head of the quote is the reliably co-located part.
 */
const MIN_MATCH_LEN = 8;
const PREFIX_LENGTHS = [Infinity, 320, 200, 130, 80, 48];

/** Strips markdown tokens the plain text layer won't contain, then collapses. */
function normalizeQuote(quote: string): string {
  return quote
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface NormalizedText {
  text: string;
  positions: { node: Text; offset: number }[];
}

/** Builds the container's whitespace-collapsed text and a char-to-node map. */
function buildNormalizedText(container: HTMLElement): NormalizedText {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let text = "";
  const positions: { node: Text; offset: number }[] = [];
  let pendingSpace = false;

  let n: Node | null;
  while ((n = walker.nextNode()) !== null) {
    const node = n as Text;
    const value = node.nodeValue ?? "";
    for (let i = 0; i < value.length; i++) {
      const ch = value[i]!;
      if (/\s/.test(ch)) {
        pendingSpace = text.length > 0;
        continue;
      }
      if (pendingSpace) {
        text += " ";
        positions.push({ node, offset: i });
        pendingSpace = false;
      }
      text += ch.toLowerCase();
      positions.push({ node, offset: i });
    }
  }

  return { text, positions };
}

export function findQuoteRange(container: HTMLElement, quote: string): Range | null {
  const target = normalizeQuote(quote);
  if (target.length < MIN_MATCH_LEN) return null;

  const { text, positions } = buildNormalizedText(container);

  for (const len of PREFIX_LENGTHS) {
    const needle = len === Infinity ? target : target.slice(0, len);
    if (needle.length < MIN_MATCH_LEN) continue;
    const idx = text.indexOf(needle);
    if (idx === -1) continue;

    const start = positions[idx];
    const end = positions[idx + needle.length - 1];
    if (!start || !end) continue;

    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset + 1);
    return range;
  }

  return null;
}
