/**
 * Resolves an HTML `{ partIndex, selector, charStart, charEnd }` citation
 * location to a DOM Range inside the given root.
 *
 * The viewer renders all DocumentParts inside the root, each wrapped in a
 * `[data-part-index="N"]` element. This locator narrows to the right part
 * first, then resolves the structural selector inside it, then walks the
 * text descendants to pick the slice covering [charStart, charEnd].
 *
 * Offsets are indexed against the block's whitespace-collapsed text, matching
 * the parser's `extractText` normalization. Resolving them against the raw DOM
 * text instead would drift on any block whose markup carries insignificant
 * whitespace (blockquotes, `<pre>`, nested lists all render with leading and
 * inter-line newlines), pushing the highlight onto blank characters or
 * truncating it.
 *
 * Returns null when the selector doesn't resolve or the offsets fall outside
 * the element's text content (the document changed since indexing).
 */
export function locateHtmlRange(
  root: HTMLElement,
  partIndex: number,
  selector: string,
  charStart: number,
  charEnd: number,
): Range | null {
  const partRoot = root.querySelector(`[data-part-index="${partIndex}"]`);
  if (!(partRoot instanceof HTMLElement)) return null;

  let node: Element | null;
  try {
    node = partRoot.querySelector(selector);
  } catch {
    return null;
  }
  if (!(node instanceof HTMLElement)) return null;

  const map = buildNormalizedMap(node);
  const start = domPositionAt(map, charStart);
  const end = domPositionAt(map, charEnd);
  if (!start || !end) return null;

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

interface NormalizedPoint {
  node: Text;
  offset: number;
}

interface NormalizedMap {
  length: number;
  // `starts[i]` is the DOM position of normalized character i; `end` is the
  // position just past the last normalized character.
  starts: NormalizedPoint[];
  end: NormalizedPoint | null;
}

/**
 * Walks an element's text descendants and reproduces the parser's
 * `text.replace(/\s+/g, " ").trim()` normalization, recording the DOM position
 * each surviving character maps back to. This lets offsets stored against the
 * normalized text resolve to a Range in the live (un-normalized) DOM.
 */
function buildNormalizedMap(node: Element): NormalizedMap {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const starts: NormalizedPoint[] = [];
  let end: NormalizedPoint | null = null;
  let pendingSpace = false;

  let textNode = walker.nextNode() as Text | null;
  while (textNode) {
    const data = textNode.data;
    for (let i = 0; i < data.length; i++) {
      const isSpace = /\s/.test(data[i]!);
      if (isSpace) {
        if (starts.length > 0) pendingSpace = true;
        continue;
      }
      // A collapsed whitespace run becomes one space; anchor it just past the
      // preceding character so a range ending at that space stops before the
      // gap rather than swallowing it.
      if (pendingSpace) {
        if (end) starts.push(end);
        pendingSpace = false;
      }
      starts.push({ node: textNode, offset: i });
      end = { node: textNode, offset: i + 1 };
    }
    textNode = walker.nextNode() as Text | null;
  }

  return { length: starts.length, starts, end };
}

function domPositionAt(map: NormalizedMap, index: number): NormalizedPoint | null {
  if (index < 0 || index > map.length) return null;
  if (index < map.length) return map.starts[index]!;
  return map.end;
}

/**
 * Inverse of `locateHtmlRange`: given a live DOM Range inside a rendered
 * document, returns the location triple the parser would have produced.
 * Used by the viewer's "comment on selection" flow.
 *
 * Returns null when the selection straddles part boundaries or escapes the
 * root.
 */
export function rangeToHtmlLocation(
  root: HTMLElement,
  range: Range,
): { partIndex: number; selector: string; charStart: number; charEnd: number } | null {
  const partRoot = closestAncestor(range.startContainer, (n) => {
    if (!(n instanceof HTMLElement)) return false;
    return n.hasAttribute("data-part-index");
  }) as HTMLElement | null;
  if (!partRoot) return null;
  const partIndexAttr = partRoot.getAttribute("data-part-index");
  if (partIndexAttr === null) return null;
  const partIndex = Number.parseInt(partIndexAttr, 10);
  if (!Number.isFinite(partIndex)) return null;

  const block = closestBlockAncestor(range.startContainer, partRoot);
  if (!block) return null;

  const selector = structuralSelector(partRoot, block);
  if (!selector) return null;

  const offsets = textOffsetsWithin(block, range);
  if (!offsets) return null;

  return {
    partIndex,
    selector,
    charStart: offsets.start,
    charEnd: offsets.end,
  };
}

/**
 * Wraps a Range with a <mark> styled for the citation highlight. The mark
 * preserves the original DOM beneath it so the text remains selectable
 * and accessible.
 */
export function highlightRange(range: Range): HTMLElement {
  const mark = document.createElement("mark");
  mark.className =
    "bg-highlight/45 text-highlight-foreground ring-highlight-border rounded-sm px-0.5 ring-1";
  mark.dataset.citation = "true";
  try {
    range.surroundContents(mark);
  } catch {
    // Range spans multiple parents — extract its contents into the mark
    // and re-insert.
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
  }
  return mark;
}

export function clearHighlights(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('mark[data-citation="true"]').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

const BLOCK_TAGS = new Set([
  "p",
  "li",
  "blockquote",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "td",
  "th",
]);

function closestAncestor(node: Node, pred: (n: Node) => boolean): Node | null {
  let cur: Node | null = node;
  while (cur) {
    if (pred(cur)) return cur;
    cur = cur.parentNode;
  }
  return null;
}

function closestBlockAncestor(node: Node, stopAt: HTMLElement): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== stopAt) {
    if (cur instanceof HTMLElement && BLOCK_TAGS.has(cur.tagName.toLowerCase())) {
      return cur;
    }
    cur = cur.parentNode;
  }
  return null;
}

/**
 * Computes the structural selector the parser would emit for `target`,
 * relative to `root`. Walks ancestors from target up to (but not including)
 * root, recording `tag:nth-of-type(N)` at each step.
 */
function structuralSelector(root: HTMLElement, target: HTMLElement): string | null {
  const path: string[] = [];
  let cur: HTMLElement | null = target;
  while (cur && cur !== root) {
    const parent: HTMLElement | null = cur.parentElement;
    if (!parent) return null;
    const tag = cur.tagName.toLowerCase();
    const sameTagSiblings = Array.from(parent.children).filter(
      (c) => c.tagName.toLowerCase() === tag,
    );
    const index = sameTagSiblings.indexOf(cur) + 1;
    path.unshift(`${tag}:nth-of-type(${index})`);
    cur = parent === root ? null : parent;
  }
  // Selectors resolve against the part's `[data-part-index]` element via
  // `:scope`, matching what the parser emits and what `locateHtmlRange` queries.
  return path.length > 0 ? `:scope > ${path.join(" > ")}` : null;
}

/**
 * Inverse of `buildNormalizedMap`: converts a Range's DOM endpoints into
 * offsets against the block's whitespace-collapsed text, so a location stored
 * here round-trips through `locateHtmlRange`.
 */
function textOffsetsWithin(
  block: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  const map = buildNormalizedMap(block);
  const start = normalizedIndexAt(map, range.startContainer, range.startOffset);
  const end = normalizedIndexAt(map, range.endContainer, range.endOffset);
  if (start === null || end === null) return null;
  return { start, end };
}

/**
 * Smallest normalized index whose DOM position is at or after the given raw
 * `(node, offset)`. A selection that begins inside collapsed whitespace snaps
 * forward to the next surviving character, matching how offsets were stored.
 */
function normalizedIndexAt(map: NormalizedMap, node: Node, offset: number): number | null {
  for (let i = 0; i < map.length; i++) {
    const p = map.starts[i]!;
    if (p.node === node && p.offset >= offset) return i;
  }
  if (map.end && map.end.node === node && map.end.offset >= offset) return map.length;
  return null;
}
