/**
 * Resolves an HTML `{ selector, charStart, charEnd }` citation location to a
 * DOM Range inside the given root. The selector is the structural CSS path
 * the parser computed at ingestion (e.g., `div > section:nth-of-type(2) >
 * p:nth-of-type(3)`); we walk the text descendants of the matched element
 * and pick the slice covering [charStart, charEnd].
 *
 * Returns null when the selector doesn't resolve or the offsets fall
 * outside the element's text content (e.g., the document changed since
 * indexing).
 */
export function locateHtmlRange(
  root: HTMLElement,
  selector: string,
  charStart: number,
  charEnd: number,
): Range | null {
  const node = root.querySelector(selector);
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
    // Fallback when the range spans multiple parents — extract the contents
    // and append to the mark.
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
