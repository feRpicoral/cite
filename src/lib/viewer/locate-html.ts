/**
 * Resolves an HTML `{ partIndex, selector, charStart, charEnd }` citation
 * location to a DOM Range inside the given root.
 *
 * The viewer renders all DocumentParts inside the root, each wrapped in a
 * `[data-part-index="N"]` element. This locator narrows to the right part
 * first, then resolves the structural selector inside it, then walks the
 * text descendants to pick the slice covering [charStart, charEnd].
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

  const node = partRoot.querySelector(selector);
  if (!(node instanceof HTMLElement)) return null;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  let textNode = walker.nextNode() as Text | null;
  while (textNode) {
    const len = textNode.data.length;
    const nodeStart = cursor;
    const nodeEnd = cursor + len;

    if (!startNode && charStart >= nodeStart && charStart <= nodeEnd) {
      startNode = textNode;
      startOffset = charStart - nodeStart;
    }
    if (charEnd >= nodeStart && charEnd <= nodeEnd) {
      endNode = textNode;
      endOffset = charEnd - nodeStart;
      break;
    }
    cursor = nodeEnd;
    textNode = walker.nextNode() as Text | null;
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
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
  mark.className = "bg-highlight/60 text-highlight-foreground rounded px-0.5";
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
  // The parser uses "div" as the implicit body root. Mirror that so the
  // emitted selector matches what the parser would have produced.
  return path.length > 0 ? `div > ${path.join(" > ")}` : null;
}

function textOffsetsWithin(
  block: HTMLElement,
  range: Range,
): { start: number; end: number } | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let cursor = 0;
  let start: number | null = null;
  let end: number | null = null;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.data.length;
    if (node === range.startContainer) start = cursor + range.startOffset;
    if (node === range.endContainer) {
      end = cursor + range.endOffset;
      break;
    }
    cursor += len;
    node = walker.nextNode() as Text | null;
  }
  if (start === null || end === null) return null;
  return { start, end };
}
